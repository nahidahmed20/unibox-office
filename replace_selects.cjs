const fs = require('fs');
const path = require('path');

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
    
    // Only process if there's a native <select
    if (content.match(/<select\b/)) {
        // Add import if not exists
        if (!content.includes("import CustomSelect")) {
            // Find last import statement
            const lastImportIndex = content.lastIndexOf('import ');
            if (lastImportIndex !== -1) {
                const endOfLastImport = content.indexOf('\n', lastImportIndex);
                content = content.slice(0, endOfLastImport + 1) + "import CustomSelect from '@/Components/CustomSelect';\n" + content.slice(endOfLastImport + 1);
            } else {
                content = "import CustomSelect from '@/Components/CustomSelect';\n" + content;
            }
        }

        // Replace <select ...> with <CustomSelect ...>
        content = content.replace(/<select\b/g, '<CustomSelect');
        content = content.replace(/<\/select>/g, '</CustomSelect>');

        // Try to remove tailwind chevron icons immediately after CustomSelect
        // Pattern 1: <i className="fa-solid fa-chevron-down...
        content = content.replace(/<\/CustomSelect>\s*<i[^>]*fa-chevron-down[^>]*><\/i>/g, '</CustomSelect>');
        
        // Pattern 2: <div ...><i className="fa-solid fa-chevron-down...</div>
        content = content.replace(/<\/CustomSelect>\s*<div[^>]*pointer-events-none[^>]*>\s*<i[^>]*fa-chevron-down[^>]*><\/i>\s*<\/div>/g, '</CustomSelect>');

        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
        updatedFiles++;
    }
});

console.log(`Total files updated: ${updatedFiles}`);
