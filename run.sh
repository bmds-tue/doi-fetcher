#!/bin/bash

rm -f .input.csv.swp 2>/dev/null   # removes any swap/lock nano files and silences error msgs
nano input.csv                     # Opens the input editor
node fetch-dois.js                 # Runs the fetch script

echo "doi,categories" > input.csv  # resets the input file after usage
