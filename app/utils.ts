import * as fs from 'fs';
import * as zlib from 'zlib';
import * as crypto from 'crypto';
import * as path from 'path';

export function readObjectFile(hash: string) : Buffer
{
    const dirName = hash.substring(0, 2);
    const fileName = hash.substring(2);
    const readPath = path.join(process.cwd(), ".git", "objects", dirName, fileName);
    //console.log(`Reading path is: ${readPath}`)

    const readContentBuffer : Buffer = fs.readFileSync(readPath);   //!Reading from file. get buffer.
    const unzippedData: Buffer = zlib.unzipSync(readContentBuffer); //!Decompressing that
    //console.log(`Read content is: \n${unzippedData}`);
    return unzippedData;
}

function getHashForContent(type: Buffer, content: Buffer) : {hash: Buffer, contentToWrite: Buffer}
{
    const header = Buffer.from(`${type} ${content.length}\0`);
    const writeBuffer = Buffer.concat([header,content]);
    const sum1 = crypto.createHash('sha1').update(writeBuffer);
    const sha1Hash : Buffer = sum1.digest();
    return {hash : sha1Hash, contentToWrite : writeBuffer};
}

function writeObjFile(hash: Buffer, contentToWrite: Buffer)
{    
    const hashInHex = hash.toString('hex');
    const dirName = hashInHex.slice(0,2);
    const fileName = hashInHex.slice(2);
    let writePath = path.join(process.cwd(), ".git", "objects", dirName);
    fs.mkdirSync(writePath, { recursive: true });
    const filePath = path.join(writePath, fileName);
    fs.writeFileSync(filePath,zlib.deflateSync(contentToWrite));
    //console.log(`Written a file in: ${filePath}`);
}

export function writeObjForFile(dir: string) : Buffer
{
    const fileContent = fs.readFileSync(dir);
    const blobBuffer = Buffer.from('blob');
    const hashAndData = getHashForContent(blobBuffer, fileContent);
    writeObjFile(hashAndData['hash'], hashAndData['contentToWrite']);
    return hashAndData.hash;
}


interface TreeObjectContentRow {
    type : string,
    hash : Buffer,
    name : string   //!Shouldn't be this relative xwith the root.

}

function createTreeObjectContentBuffer(item : TreeObjectContentRow ) : Buffer {
    const bufferone = Buffer.concat([Buffer.from(`${item.type} ${item.name}\0`), item.hash])
    return bufferone
}

export function writeTreeForDirectory(dir: string) : Buffer
{
    //console.log(`Entering directory: ${dir}`);    
    //console.log(`Printing contents: ${fs.readdirSync(dir)}`);

    const lsDirContents = fs.readdirSync(dir, {withFileTypes : true, recursive : false});    
    let treeObjectItems : TreeObjectContentRow[] = [];
    for(const currElem of lsDirContents)
    {
        if(currElem.name.includes(".git")) continue;

        const pathName = path.join(dir, currElem.name);
        //console.log(`Checking pathName: ${pathName} for file or dir (true for file): ${currElem.isFile()}`);
        if(currElem.isFile())
        {
            const writtenFileHash = writeObjForFile(pathName);
            const currRow  :TreeObjectContentRow =  {type : '100644', hash : writtenFileHash, name : currElem.name};
            //console.log(`curr elem file tree item: ${currRow}`);
            treeObjectItems.push(currRow);
            continue;
        }
        //!Not a file it is a director;        
        const currElemDirHash = writeTreeForDirectory(pathName);    //!Should it be a string.
        const currRow  :TreeObjectContentRow =  {type : '40000', hash : currElemDirHash, name : currElem.name};
        //console.log(`curr elem dir tree item: ${currRow}`);
        treeObjectItems.push(currRow);
    }

    //!Sort this array on the basis of names of all the elements in it.
    treeObjectItems.sort((a, b) => a.name.localeCompare(b.name));

    const buffers : Buffer[] = treeObjectItems.map(createTreeObjectContentBuffer);
    const treeBuffer = Buffer.from('tree');
    const hashAndContentToWrite = getHashForContent(treeBuffer,Buffer.concat(buffers));
    writeObjFile(hashAndContentToWrite.hash, hashAndContentToWrite.contentToWrite);        
    return hashAndContentToWrite.hash;
}

export function writeCommitObject(tree: Buffer, parent : string, message : string) : Buffer
{
    const timestamp = Math.floor(Date.now() / 1000);
    const utcOffset = new Date().getTimezoneOffset() * -60;
    const authorTime = `${timestamp} ${utcOffset >= 0 ? '+' : '-'}${Math.abs(utcOffset) / 3600 | 0}${(Math.abs(utcOffset) % 3600) / 60 | 0}`;
    const author = 'utk';

    const treeSha1 = tree.toString('hex');
    let lines = [`tree ${treeSha1}`];
    if (parent) {
        lines.push(`parent ${parent}`);
    }
    lines.push(`author ${author} ${authorTime}`);
    lines.push(`committer ${author} ${authorTime}`);
    lines.push('');
    lines.push(message);
    lines.push('');

    const data = lines.join('\n');

    const commitType = Buffer.from('commit');
    const bufferContent = Buffer.from(data);

    const {hash, contentToWrite} = getHashForContent(commitType, bufferContent);
    writeObjFile(hash, contentToWrite);
    return hash
}

// export SplitPcktLineFromBuffer

export function ProcessHTTPResponseFromGET(body: string)
{
//    console.log('Response Body:', responseBody);
            
  //  console.log("\n\nLinesSplitted");
    const repsonseLines = body.split('\n');
    console.log(`Diff lines count: ${repsonseLines.length}`);
    console.log(repsonseLines);




}