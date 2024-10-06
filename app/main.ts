import * as fs from 'fs';
import * as zlib from 'zlib';
import * as crypto from 'crypto';
import * as path from 'path';
import {readObjectFile, writeObjForFile, writeTreeForDirectory, writeCommitObject} from "./utils"

const args = process.argv.slice(2);
const command = args[0];

enum Commands {
    Init = "init",
    CatFile = "cat-file",
    HashObject = "hash-object",
    LsTree = "ls-tree",
    WriteTree = "write-tree",
    CommitTree = "commit-tree"
}

//!For debugging the arguments
//console.log('Inputs are: ')
//console.log(args);
//console.log(command);

switch (command) {
    case Commands.Init:
        fs.mkdirSync(".git", { recursive: true });
        fs.mkdirSync(".git/objects", { recursive: true });
        fs.mkdirSync(".git/refs", { recursive: true });
        fs.writeFileSync(".git/HEAD", "ref: refs/heads/main\n");
        console.log("Initialized git directory");
        break;

    case Commands.CatFile:
        {
            //!git cat-file <type> <object>
            const type : string = args[1];
            const object : string  = args[2];
            //console.log(`Correct obj captured: ${object}`);
            const content: Buffer = readObjectFile(object);
            if(type === "-p")
            {
                const nullIndex = content.indexOf('\0');
                const strContent = content.toString();
                const writtenContent = strContent.slice(nullIndex + 1);
                process.stdout.write(writtenContent);  //!Not using console.log since it will print out the null character at the end.
            }
        }
    break;
    case Commands.HashObject:
        if(args[1] === '-w')
        {
            const dir = path.join(process.cwd(), args[2]);
            const writtenFileHash = writeObjForFile(dir);
            process.stdout.write(writtenFileHash.toString('hex'));
        }
    break;
    case Commands.LsTree:
        const hash = args[2];
        const content = readObjectFile(hash);

        const indexOfFirstSpace = content.indexOf(' ');
        //console.log(`Content type: ${content.subarray(indexOfFirstSpace)}`);
        const firstNull = content.indexOf('\0');
        const sizeOfContent = content.subarray(indexOfFirstSpace +1, firstNull);
        //console.log(`Size of content: ${sizeOfContent}`);
        const beginIndex = firstNull +1;

        //!Rows of tress:
        const entries = [];
        let currentIndex = beginIndex;
        while (currentIndex < content.length) {

            // Find mode (up to the first space)
            const spaceIndex = content.indexOf(' ', currentIndex);
            const mode = content.subarray(currentIndex, spaceIndex);

            // Find the null byte after the name (mode <name>\0...)
            const nameStartIndex = spaceIndex + 1;
            const nullIndex = content.indexOf('\0', nameStartIndex);
            const name = content.subarray(nameStartIndex, nullIndex);


            // Extract the SHA (20 bytes starting after the null byte)
            const shaStartIndex = nullIndex + 1;
            const sha = content.subarray(shaStartIndex, shaStartIndex + 20);
            //console.log(sha.toString('hex'));

            // Add this entry to the list
            entries.push({ mode, name, sha });

            // Move the index to the next entry
            currentIndex = shaStartIndex + 20;
            //console.log(`Mode: ${mode}, Name: ${name}, Hash: ${sha.toString('hex')}`);
        }

        if(args[1] === "--name-only")
        {
            entries.forEach((elem) => console.log(elem.name.toString()));
        }
    break;
    case Commands.WriteTree:
        //const lsdirInfo = fs.readdirSync(".", {recursive : false});   //!For debugging...
        const treeObjRow = writeTreeForDirectory(process.cwd());
        process.stdout.write(treeObjRow.toString('hex'));
    break;
    case Commands.CommitTree:
    const treeSha = args[1];   //!Tree sha
    const option = args[2];
    const parentSHa = args[3];
    const messageOption = args[4];
    const message = args[5];


    if(option === "-p" && messageOption === "-m")
    {
        const commitHash = writeCommitObject(Buffer.from(treeSha, 'hex'), parentSHa, message);
        console.log(commitHash.toString('hex'));
    }
    break;
    default:
        throw new Error(`Unknown command ${command}`);
}