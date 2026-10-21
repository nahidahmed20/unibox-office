const fs = require('fs');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.jsx')) results.push(file);
        }
    });
    return results;
}

const files = walk('./resources/js/Pages/Admin');
let updatedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // We want to replace <CustomSelect value={perPage} ... > ... </CustomSelect>
    // Since CustomSelect can span multiple lines, we can use a regex to match CustomSelect blocks
    // containing 'value={perPage}'.
    
    // Pattern to match `<CustomSelect ... value={perPage} ... > ... </CustomSelect>`
    // Non-greedy match for content inside tag
    const regex = /<CustomSelect([^>]*value=\{perPage\}[^>]*)>([\s\S]*?)<\/CustomSelect>/g;
    
    content = content.replace(regex, (match, attrs, children) => {
        changed = true;
        // Rebuild native select and restore the chevron
        return `<select${attrs}>\n${children}</select>\n<i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none"></i>`;
    });

    // Let's also check for 'value={yearFilter}' and revert them too, as they might be next to 'Show' and usually tiny
    // But the user only mentioned 'show er design'. Let's strictly stick to 'perPage' first.

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Reverted perPage in ${file}`);
        updatedFiles++;
    }
});

console.log(`Total files updated: ${updatedFiles}`);

