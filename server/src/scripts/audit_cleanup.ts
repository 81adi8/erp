import * as fs from 'fs';
import * as path from 'path';

const srcDir = path.join(__dirname, '..'); // server/src
const modulesDir = path.join(srcDir, 'modules');
const schoolModulesDir = path.join(modulesDir, 'school');

// recursive find files
function findFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            if (file !== 'node_modules' && file !== '__tests__' && file !== 'dist') {
                findFiles(filePath, fileList);
            }
        } else {
            if (filePath.endsWith('.ts')) {
                fileList.push(filePath);
            }
        }
    }
    return fileList;
}

const allTsFiles = findFiles(srcDir);

// Read contents once to speed up grep logic
const filesData = allTsFiles.map(f => {
    return {
        filePath: f,
        basename: path.basename(f),
        baseWithoutExt: path.basename(f, '.ts'),
        content: fs.readFileSync(f, 'utf-8'),
        size: fs.statSync(f).size
    };
});

function getImportCount(fileInfo: any) {
    let count = 0;
    const searchString = fileInfo.baseWithoutExt;
    if (searchString === 'index' || searchString === 'app') return 999; // Ignore

    for (const other of filesData) {
        if (other.filePath === fileInfo.filePath) continue;
        if (other.content.includes(searchString)) {
            count++;
        }
    }
    return count;
}

console.log('=======================================================');
console.log('STEP 1 — FIND DEAD FILES');
console.log('=======================================================');

console.log('\n# Files that are never imported anywhere (Excluding index/app/scripts/tests/migrations)');
const neverImported: string[] = [];
for (const file of filesData) {
    if (file.basename.includes('index') || file.basename.includes('app.ts') || file.filePath.includes('\\scripts\\') || file.filePath.includes('/scripts/')) continue;
    if (file.filePath.includes('migration') || file.filePath.includes('-config')) continue;
    
    // Ignore *.vX.* explicitly because we have a separate check for them from requirements
    // Wait, let's keep it to strictly follow bash script
    
    if (getImportCount(file) === 0) {
        console.log(`POTENTIALLY UNUSED: ${file.filePath}`);
        neverImported.push(file.filePath);
    }
}

console.log('\n# Versioned files');
const versionedFiles = filesData.filter(f => /\.v[1-3]\./.test(f.basename));
versionedFiles.forEach(f => console.log(f.filePath));

console.log('\n# Backup/temp/old files');
const backupRegex = /old|backup|copy|temp|unused|draft/i;
const backupFiles = filesData.filter(f => backupRegex.test(f.basename));
backupFiles.forEach(f => console.log(f.filePath));

console.log('\n# Empty files (0 bytes)');
const emptyFiles = filesData.filter(f => f.size === 0);
emptyFiles.forEach(f => console.log(f.filePath));

console.log('\n# Files with only comments or only imports (no real code)');
const minimalFiles = [];
for (const file of filesData) {
    const lines = file.content.split(/\r?\n/);
    let realCodeLines = 0;
    for (let line of lines) {
        line = line.trim();
        if (line === '') continue;
        if (line.startsWith('//')) continue;
        if (line.startsWith('import ')) continue;
        if (line === 'export {}' || line === 'export {};') continue;
        realCodeLines++;
    }
    if (realCodeLines < 3 && file.size > 0) {
        console.log(`NEARLY EMPTY: ${file.filePath} (${realCodeLines} non-import lines)`);
        minimalFiles.push(file.filePath);
    }
}

console.log('\n=======================================================');
console.log('STEP 2 — FIND DUPLICATE LOGIC');
console.log('=======================================================');

const serviceFiles = filesData.filter(f => f.basename.endsWith('.service.ts'));
const serviceBasenames = serviceFiles.map(f => f.basename);
const duplicates = serviceBasenames.filter((item, index) => serviceBasenames.indexOf(item) !== index);
const uniqueDupes = [...new Set(duplicates)];
console.log('\n# Multiple versions of same service');
uniqueDupes.forEach(d => console.log(d));

console.log('\n# Check if old school/services/ files are still used');
const oldSchoolServices = filesData.filter(f => f.filePath.includes(`modules\\school\\services\\`) || f.filePath.includes(`modules/school/services/`));
oldSchoolServices.forEach(f => {
    const c = getImportCount(f);
    console.log(`- ${f.basename} (Imported ${c} times)`);
});

console.log('\n# Check school/controllers/ top-level');
const oldSchoolControllers = filesData.filter(f => f.filePath.includes(`modules\\school\\controllers\\`) || f.filePath.includes(`modules/school/controllers/`));
oldSchoolControllers.forEach(f => {
    const c = getImportCount(f);
    console.log(`- ${f.basename} (Imported ${c} times)`);
});

console.log('\n# Check school/repositories/ top-level');
const oldSchoolRepositories = filesData.filter(f => f.filePath.includes(`modules\\school\\repositories\\`) || f.filePath.includes(`modules/school/repositories/`));
oldSchoolRepositories.forEach(f => {
    const c = getImportCount(f);
    console.log(`- ${f.basename} (Imported ${c} times)`);
});

console.log('\n=======================================================');
console.log('STEP 3 — FIND SKELETON/STUB MODULES');
console.log('=======================================================');

console.log('\n# Modules with only index.ts or only routes');
const mainModules = fs.readdirSync(modulesDir).filter(dir => fs.statSync(path.join(modulesDir, dir)).isDirectory());
for (const m of mainModules) {
    const mPath = path.join(modulesDir, m);
    const tsFilesInRoot = fs.readdirSync(mPath).filter(f => f.endsWith('.ts'));
    if (tsFilesInRoot.length <= 1) {
        // Also check if any subfolders have real files
        const allMFiles = findFiles(mPath);
        if (allMFiles.length <= 2) {
            console.log(`SKELETON MODULE: ${mPath} (${allMFiles.length} files)`);
        }
    }
}

const universityModule = path.join(modulesDir, 'university');
if (fs.existsSync(universityModule)) {
    console.log('\n# University module check');
    const uFiles = findFiles(universityModule);
    uFiles.forEach(f => console.log(f));
    
    let uImports = 0;
    for (const file of filesData) {
        if (file.filePath.includes('university')) continue;
        if (file.content.includes('university')) {
            uImports++;
        }
    }
    console.log(`Q: Is university module imported outside? A: Found ${uImports} occurrences of 'university' string in non-university files.`);
}

console.log('\n=======================================================');
console.log('STEP 4 — FIND SCRIPT FILES THAT SHOULD NOT BE IN SRC');
console.log('=======================================================');
const scriptsDir = path.join(srcDir, 'scripts');
if (fs.existsSync(scriptsDir)) {
    const scriptFiles = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.ts'));
    scriptFiles.forEach(f => console.log(f));
}
