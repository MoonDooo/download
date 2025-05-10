const express = require('express')
const path = require('path');
const fs = require('fs');
const app = express();


const PORT = 8000;
const SHARED_DIR = path.resolve('S:/');

app.use(express.static(path.join(__dirname, 'public')))

function search(absPath){
    try{
        const items = fs.readdirSync(absPath);
        const data =  items.map(item => {
            try{
                const itemPath = path.join(absPath, item);
                const stat = fs.statSync(itemPath);

                return {
                    name: item,
                    path: itemPath,
                    type: stat.isDirectory() ? 'directory':'file'
                };
            }catch(err){
                return null;
            }
        }).filter(Boolean);
        console.log(data);
        data.sort((a,b)=>{
            if(a.type !== b.type){
                return a.type === 'directory' ? -1 : 1;
            }

            return a.name.localeCompare(b.name);
        })
        return data;
    } catch(err){
        console.error("err", err);
        return { error: 'Invaild Path OR access denied.'};
    }
}

app.get('/files', (req, res) => {
    const reqPath = req.query.path;
    
    if(!reqPath){
        return res.status(400).json({ error: 'Path NOT FOUND'});
    }

    const absPath = path.resolve(reqPath);
    const data = search(absPath);
    console.log(data);
    res.json(data);
});

app.get('/files/init', (req, res)=>{
    return res.json({rootDir: SHARED_DIR});
})


app.get('/download/file', (req, res) => {
    console.log(req);
    const filePath = path.resolve(req.query.path);
    const fileName = path.basename(filePath);

    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
    }
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`); 
    res.setHeader('Content-Type', 'application/octet-stream'); 
    res.download(filePath, path.basename(filePath), (err) => {
        if (err) {
            console.error('Download error:', err);
            res.status(500).send('Download failed');
        }
    });
});

function getFolderStructure(dirPath, basePath){
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    return entries.map(entry => {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(basePath, fullPath);

        if(entry.isDirectory()){
            return {
                name: entry.name,
                path: fullPath,
                relativePath: relativePath,
                type: 'directory',
                itnes: getFolderStructure(fullPath, basePath)
            };
        }else{
            return {
                name: entry.name,
                path: fullPath,
                relativePath: relativePath,
                type: 'file'
            }
        }
    });
}

app.get('/download/folder', (req, res)=> {
    console.log('폴더 다운로드');
    const requestedPath = req.query.path;
    const folderName = req.query.folderName;
    if(!requestedPath){
        return res.status(400).json({error: 'path 파라미터 없어.'});
    }

    const targetPath = path.resolve(requestedPath);
    if(!fs.existsSync(targetPath)){
        return res.status(404).json({ error: '지정한 경로가 존재하지 않습니다.' })
    }   

    try{
        const structure = getFolderStructure(targetPath, targetPath);

        res.json( { root: targetPath, folderName: folderName,item: structure });
    }catch(err){
        console.error('폴도 구조 에러:', err);
        res.status(500).json({error : "폴더 구조 에러"});
    }
});

app.listen(PORT, ()=>{
    console.log(`start`);
})