for file in *; do
    if [[ "$file" == *.js || "$file" == *.html || "$file" == *.css  ]]; then
        echo "// File: $file" >> combined.txt
        cat "$file" >> combined.txt
        echo "" >> combined.txt
    fi
done