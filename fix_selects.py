import os
import re

directory = 'resources/js/Pages'

pattern = re.compile(r'\s*<div\s+className="pointer-events-none\s+absolute\s+inset-y-0\s+right-0\s+flex\s+items-center\s+px-3\.5\s+text-gray-400">.*?</svg>\s*</div>', re.DOTALL)

count = 0
for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = pattern.sub('', content)
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
                count += 1

print(f"Total files updated: {count}")
