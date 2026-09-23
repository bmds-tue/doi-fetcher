import fs from 'fs/promises';
import path from 'path';
import { parseInputCsv } from './csv.js';

const INPUT_PATH = path.join('input.csv');
const DATA_PATH = path.join('data', 'papers-data.json');

const headers = {
  'User-Agent': 'doi-fetcher/1.0 (mailto:your@email.com)',
};

async function fetchPaperMetadata(doi, categories) {
  const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const item = data.message;
    console.log('fetched '+ doi)
    return {
      title: Array.isArray(item.title) ? item.title[0] : item.title || 'Unknown',
      authors: item.author?.map(a => `${a.given} ${a.family}`) || [],
      journal: item['container-title']?.[0] || '',
      publisher: item.publisher || '',
      doi: item.DOI,
      url: `https://doi.org/${item.DOI}`,
      year: item.issued?.['date-parts']?.[0]?.[0] || null,
      volume: item.volume || '',
      issue: item.issue || '',
      pp: item.page || '',
      categories
    };
  } catch (err) {
    console.warn(`❌  ${doi}  - failed due to crossref error: ${err.message}`);
    return null;
  }
}

function normalizeDoi(input) {
  return input.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
}

async function loadEntriesFromInput() {
  const raw = await fs.readFile(INPUT_PATH, 'utf8');
  return parseInputCsv(raw);
}

async function loadExistingMetadata() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Failed to load ${DATA_PATH}: ${err.message}`);
    process.exit(1);
  }
}

async function main() {
  const inputEntries = await loadEntriesFromInput();
  const existingData = await loadExistingMetadata();
  const existingDois = new Set(existingData.map(p => p.doi));

  const newEntries = new Map();   // doi -> Set of categories

  for (const entry of inputEntries) {
    const doi = normalizeDoi(entry.doi);
    if (existingDois.has(doi)) {
      console.log(`⚠️ Skipped  ${doi}  - already exists in data`)
    } else if (newEntries.has(doi)) {
      // same paper listed twice - keep it once, with the categories of both rows
      const categories = newEntries.get(doi);
      const added = entry.categories.filter(c => !categories.has(c));
      added.forEach(c => categories.add(c));
      console.log(`⚠️ Merged  ${doi}  - occurs multiple times in your input`
        + (added.length ? ` (added categories: ${added.join(', ')})` : ''))
    }
    else {
      newEntries.set(doi, new Set(entry.categories));
    }
  }

  if (newEntries.size === 0) {
    console.log('⚠️ No new DOIs to add.');
    return;
  }

  console.log(`\nFetching ${newEntries.size} new papers...`);

  const newMetadata = [];
  for (const [doi, categories] of newEntries) {
    const meta = await fetchPaperMetadata(doi, [...categories]);
    if (meta) newMetadata.push(meta);
  }

  if (newMetadata.length === 0) {
    console.log('⚠️ No new metadata could be fetched. Check your input');
    return;
  }

  const withoutCategories = newMetadata.filter(p => p.categories.length === 0);
  if (withoutCategories.length) {
    console.log(`\n⚠️ ${withoutCategories.length} paper(s) have no categories:`);
    withoutCategories.forEach(p => console.log(`   ${p.doi}`));
  }

  const updated = [...newMetadata, ...existingData];

  await fs.writeFile(DATA_PATH, JSON.stringify(updated, null, 2));
  console.log(`\n✅ ${newMetadata.length} new Papers added`);
  console.log('\n')
}

main().catch(err => {
  console.error('❌ Error running fetch script:', err);
  process.exit(1);
});
