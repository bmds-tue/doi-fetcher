Follow these steps to add new papers:
1. clone this repository
2. docker-compose build
3. docker-compose run --rm -it doi-fetcher
4. collect the new paper data in data/papersData.json

If there is a problem with docker in Step 3 rebuild the app by running:

docker-compose down
docker-compose build

then retry step 3

## Input format

Step 3 opens `input.csv` in nano. It is a CSV with one paper per line: a DOI and
the categories that paper belongs to.

```csv
doi,categories
10.1038/s41586-020-2649-2,"Machine Learning; Imaging"
https://doi.org/10.1145/3292500.3330701,Recommender Systems
10.1001/jama.2016.17216,
```

- the `doi,categories` header line is optional, but keep it if you are unsure
- a DOI may be written bare or as a `https://doi.org/...` link
- several categories go in one quoted cell separated by `;` (or `|`), or in
  additional columns: `10.1038/s41586-020-2649-2,Machine Learning,Imaging`
- a paper without categories is still added, and is listed in the output so you
  can spot it
- if the same DOI appears in several lines, the categories of those lines are merged

The categories are stored with the rest of the metadata in
`data/papers-data.json`:

```json
{
  "title": "Array programming with NumPy",
  "authors": ["Charles R. Harris", "..."],
  "journal": "Nature",
  "publisher": "Springer Science and Business Media LLC",
  "doi": "10.1038/s41586-020-2649-2",
  "url": "https://doi.org/10.1038/s41586-020-2649-2",
  "year": 2020,
  "volume": "585",
  "issue": "7825",
  "pp": "357-362",
  "categories": ["Machine Learning", "Imaging"]
}
```

DOIs that are already in `data/papers-data.json` are skipped, as before - to
change the categories of a paper that has already been added, edit
`data/papers-data.json` directly.
