import csv
import codecs
import traceback
import sys

try:
    with codecs.open('/Users/kimjiyeon/.gemini/antigravity/scratch/amazonreach/Keyword Stats 2026-02-20 at 14_31_26.csv', 'r', 'utf-16-le') as f:
        # Check rows
        lines = f.readlines()
        if len(lines) < 3:
            print("File is too short or empty")
            sys.exit(1)
            
        print("First line:", lines[0].strip())
        print("Second line:", lines[1].strip())
        print("Third line (headers):", lines[2].strip())
        
        # The first two lines might be metadata in Google Keyword Planner exports
        # We start reading from the third line (index 2)
        reader = csv.reader(lines[2:], delimiter='\t')
        headers = next(reader)
        print("Headers:", headers)
        
        # Try to find exactly where Keyword, Volume, and Competition are
        kw_idx = 0
        vol_idx = 3
        comp_idx = 5
        for i, h in enumerate(headers):
            h_lower = h.lower()
            if 'keyword' in h_lower: kw_idx = i
            if 'searches' in h_lower or 'volume' in h_lower: vol_idx = i
            if 'competition' in h_lower and 'index' not in h_lower: comp_idx = i
            
        print(f"Indices -> Kw: {kw_idx}, Vol: {vol_idx}, Comp: {comp_idx}")
        
        results = []
        for row in reader:
            if len(row) > max(kw_idx, vol_idx, comp_idx):
                kw = row[kw_idx]
                vol_str = row[vol_idx].replace(',', '').replace('"', '')
                comp = row[comp_idx].strip()
                
                try:
                    vol = int(vol_str) if vol_str.isdigit() else 0
                    if vol > 100:
                        results.append((kw, vol, comp))
                except Exception as e:
                    pass
                    
        # Filter for good ones and sort
        good_kws = [r for r in results if r[2] in ('Low', 'Medium')]
        good_kws.sort(key=lambda x: x[1], reverse=True)
        
        with codecs.open('/Users/kimjiyeon/.gemini/antigravity/scratch/amazonreach/recommended_keywords.md', 'w', 'utf-8') as out:
            out.write("## Recommended Low/Medium Competition Keywords\n")
            for r in good_kws[:100]:
                out.write(f"- {r[0]} | Volume: {r[1]} | Comp: {r[2]}\n")
            
            out.write("\n## Top Keywords Overall (including High Comp)\n")
            results.sort(key=lambda x: x[1], reverse=True)
            for r in results[:50]:
                out.write(f"- {r[0]} | Volume: {r[1]} | Comp: {r[2]}\n")
                
        print("SUCCESS! Keywords written to recommended_keywords.md")
except Exception as e:
    print("FAILED")
    traceback.print_exc()
