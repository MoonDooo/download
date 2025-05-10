const fileList = document.getElementById('file-list');
const currentPath = document.getElementById('current-path');
let rootdir = '';
let currentDir = '';

window.onpopstate = (event) => {
    if (event.state && event.state.path) {
        console.log("history pop > ", event.state.path);
        getFiles(event.state.path);
    }

};
async function fetchFiles(path) {
    if (currentDir && path !== currentDir) {
        history.pushState({ path: path }, '', '');
    }
    await getFiles(path);
}

async function getFiles(path) {
    currentDir = path;
    const res = await fetch(`/files?path=${encodeURIComponent(path)}`);
    const files = await res.json();
    await renderingFileList(path, files);
    console.log(history);
}

function renderingFileList(path, files) {
    fileList.innerHTML = '';
    currentPath.textContent = `경로: ${path}`;

    if (path !== rootdir) {
        const parentPath = path.split(/[\\/]/).slice(0, -1).join('/');
        const up = document.createElement('li');
        up.textContent = '⬆️ .. (상위로)'
        up.onclick = () => fetchFiles(parentPath || rootdir);
        fileList.appendChild(up);
    }

    files.forEach(item => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.gap = '10px';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = item.name;
        nameSpan.style.flexGrow = '1';
        nameSpan.style.cursor = 'pointer';

        if (item.type === 'directory') {
            nameSpan.style.color = 'blue';
        }

        // 이름 클릭 시: 폴더는 탐색, 파일은 아무 동작 없음
        nameSpan.onclick = () => {
            if (item.type === 'directory') {
                fetchFiles(item.path);
            } else {
                window.location.href = `/download/file?path=${encodeURIComponent(item.path)}`;
            }
        };


        const actionBtn = document.createElement('button');
        actionBtn.textContent = '➡️다운로드';
        actionBtn.title = item.type === 'directory' ? '이동' : '다운로드';

        actionBtn.onclick = async (e) => {
            e.stopPropagation();

            if (item.type === 'directory') {
                try {
                    if (!window.showDirectoryPicker) {
                        alert('❌ 이 브라우저는 폴더 저장을 지원하지 않습니다.');
                        return;
                    }
                    const res = await fetch(`/download/folder?path=${encodeURIComponent(item.path)}&folderName=${item.name}`);
                    if (!res.ok) {
                        throw new Error('폴더 구조 요청 실패');
                    }
                    const folderData = await res.json();
                    const folderName = folderData.folderName;
                    console.log(folderName);
                    const rootHandle = await window.showDirectoryPicker();
                    const baseDir = await rootHandle.getDirectoryHandle(folderName, { create: true });
                    console.log(1);
                    createRecursiveItems(baseDir, folderData.item);

                    console.log('폴더 구조:', folderData);
                    alert(`콘솔 폴더 구조 확인: ${item.name}`);
                } catch (err) {
                    console.error(err);
                }
            } else {
                try {
                    const dirHandle = await window.showDirectoryPicker();
                    const res = await fetch(`/download/file?path=${encodeURIComponent(item.path)}`);
                    const blob = await res.blob();
                    await saveFileToDirectory(dirHandle, item.name, blob);
                    alert('파일이 저장되었습니다!');
                } catch (err) {
                    console.error('다운로드 실패:', err);
                }
            }
        };

        li.appendChild(nameSpan);
        li.appendChild(actionBtn);
        fileList.appendChild(li);
    });
}

async function saveFileToDirectory(dirHandle, fileName, fileContent) {
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(fileContent);
    await writable.close();
}

async function getRootDir() {
    try {
        const res = await fetch('/files/init');
        const data = await res.json();
        return data.rootDir;
    } catch (err) {
        console.log('Error:', err);
        return null;
    }
}

async function createRecursiveItems(dirHandle, items) {
    for (const item of items) {
        if (item.type === 'directory') {
            const subDir = await dirHandle.getDirectoryHandle(item.name, { create: true });
            if (item.children) {
                await createRecursiveItems(subDir, item.children);
            }
        } else {
            const fileHandle = await dirHandle.getFileHandle(item.name, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write('');
            await writable.close();
        }
    }
}

async function init() {
    rootdir = await getRootDir();
    getFiles(rootdir);
}
init();
