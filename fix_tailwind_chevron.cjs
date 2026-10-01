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
    let original = content;
    
    // We want to match <select ... value={perPage} ... >
    // Because > can appear in arrow functions inside onChange, we must match up to the end of the select tag smartly.
    // The safest way is to match <select and then anything until we find the closing > that isn't part of an arrow function.
    // Actually, just doing replace on className="... appearance-none ..." where value={perPage} is near.
    
    // Let's just find <select and its body until </select>
    content = content.replace(/<select([\s\S]*?)<\/select>/g, (match, body) => {
        if (body.includes('value={perPage}')) {
            // Remove appearance-none
            let newMatch = match.replace(/\bappearance-none\b/g, '');
            newMatch = newMatch.replace(/\[background-image:none\]/g, '');
            newMatch = newMatch.replace(/\bbg-none\b/g, '');
            newMatch = newMatch.replace(/style=\{\{\s*backgroundImage:\s*'none'\s*\}\}/g, '');
            // Clean double spaces in className
            newMatch = newMatch.replace(/className="([^"]*)"/g, (m, c) => `className="${c.replace(/\s+/g, ' ').trim()}"`);
            return newMatch;
        }
        return match;
    });

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Cleaned up Tailwind forms classes in ${file}`);
        updatedFiles++;
    }
});

console.log(`Total files updated: ${updatedFiles}`);

