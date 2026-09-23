// Minimal RFC-4180 style CSV parsing, plus the input-specific interpretation
// of a row: one DOI and the list of categories that belong to it.

const CATEGORY_SEPARATORS = /[;|]/;   // categories inside one cell: "A; B" or "A|B"

/**
 * Splits CSV text into rows of raw cell strings.
 * Handles quoted cells ("..." with "" as an escaped quote), embedded commas
 * and newlines, CRLF line endings and a leading UTF-8 BOM.
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  let cellWasQuoted = false;

  const src = text.replace(/^﻿/, '');

  const endCell = () => {
    row.push(cellWasQuoted ? cell : cell.trim());
    cell = '';
    cellWasQuoted = false;
  };
  const endRow = () => {
    endCell();
    if (row.some(c => c.length)) rows.push(row);
    row = [];
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"' && cell.trim() === '') {
      cell = '';
      inQuotes = true;
      cellWasQuoted = true;
    } else if (ch === ',') {
      endCell();
    } else if (ch === '\n') {
      endRow();
    } else if (ch === '\r') {
      // part of CRLF - the \n does the work
    } else {
      cell += ch;
    }
  }

  if (cell.length || row.length) endRow();

  return rows;
}

function isHeaderRow(row) {
  return row.some(c => c.toLowerCase() === 'doi');
}

function splitCategories(cells) {
  return cells
    .flatMap(c => c.split(CATEGORY_SEPARATORS))
    .map(c => c.trim())
    .filter(c => c.length);
}

/**
 * Turns CSV text into [{ doi, categories }] entries.
 *
 * Accepted shapes:
 *   - with a header row containing a "doi" column, categories taken from a
 *     "categories"/"category" column if present, otherwise from every other column
 *   - without a header row: first column is the DOI, every other column a category
 *
 * A single categories cell may list several categories separated by ";" or "|".
 */
export function parseInputCsv(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  let doiIndex = 0;
  let categoryIndexes = null;   // null = "every column except the DOI column"

  if (isHeaderRow(rows[0])) {
    const header = rows.shift().map(c => c.toLowerCase());
    doiIndex = header.findIndex(c => c === 'doi');
    const named = header
      .map((c, i) => (c === 'categories' || c === 'category' ? i : -1))
      .filter(i => i !== -1);
    if (named.length) categoryIndexes = named;
  }

  return rows
    .map(row => {
      const doi = (row[doiIndex] || '').trim();
      const cells = categoryIndexes
        ? categoryIndexes.map(i => row[i] || '')
        : row.filter((_, i) => i !== doiIndex);
      return { doi, categories: splitCategories(cells) };
    })
    .filter(entry => entry.doi.length);
}
