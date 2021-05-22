#!/bin/bash
for file in *
do
    if [ -f "$file" ]
    then
        base=${file##*/}
        noext=${base%.*}
        newfile=$(printf '%s' "$noext" | openssl sha1 | awk '{print $2}')
        echo "Copying $file..."
        cp "$file" "$newfile.m4a"
    fi
done