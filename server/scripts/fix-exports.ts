import fs from 'fs';
import path from 'path';

const modelsDir = path.join(__dirname, '../database/models/tenant');

const fixExports = () => {
    if (!fs.existsSync(modelsDir)) {
        console.error('Models directory not found:', modelsDir);
        process.exit(1);
    }

    const files = fs.readdirSync(modelsDir);
    let fixedCount = 0;

    for (const file of files) {
        if (!file.endsWith('.ts')) continue;

        const filePath = path.join(modelsDir, file);
        let content = fs.readFileSync(filePath, 'utf8');

        if (content.includes('export default')) {
            console.log(`Skipping ${file} - already has default export.`);
            continue;
        }

        const classMatch = content.match(/export class (\w+)/);
        if (classMatch) {
            const className = classMatch[1];
            content += `\nexport default ${className};\n`;
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Fixed ${file} - added export default ${className};`);
            fixedCount++;
        } else {
            console.warn(`Could not find class definition in ${file}`);
        }
    }

    console.log(`\nFixed ${fixedCount} files.`);
};

fixExports();
