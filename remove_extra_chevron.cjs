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
    
    // Pattern to match exactly what we added:
    // </select>\n<i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none"></i>
    
    const targetString = `</select>\n<i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none"></i>`;
    const targetString2 = `</select>\r\n<i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none"></i>`;
    
    if (content.includes(targetString) || content.includes(targetString2)) {
        content = content.replace(targetString, '</select>');
        content = content.replace(targetString2, '</select>');
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Removed extra chevron in ${file}`);
        updatedFiles++;
    }
});

console.log(`Total files updated: ${updatedFiles}`);

