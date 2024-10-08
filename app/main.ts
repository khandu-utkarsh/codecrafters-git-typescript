import * as fs from 'fs';
import * as zlib from 'zlib';
import * as crypto from 'crypto';
import * as path from 'path';
import {readObjectFile, writeObjForFile, writeTreeForDirectory, writeCommitObject} from "./utils"
import { get } from 'https';

const args = process.argv.slice(2);
const command = args[0];

enum Commands {
    Init = "init",
    CatFile = "cat-file",
    HashObject = "hash-object",
    LsTree = "ls-tree",
    WriteTree = "write-tree",
    CommitTree = "commit-tree",
    Clone = "clone"
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
    case Commands.Clone:
        const url = args[1];
        const destinationDirectory = args[2];


        //!Request to git-upload pack to discover the service.
        //!Second is the negotiation with the server to get the appropriate packages:



        const firstReqUrl = `${url}/info/refs?service=git-upload-pack`;
        const url2 = `${url}/git-upload-pack`;
        console.log(`Url asked is: ${firstReqUrl}`);

        //To be implemented....



        //!Implementing GIT HTTP Request

        const options = {headers: {"Git-Protocol": "version=2"}};
        get(firstReqUrl, options,
            (incomingMessage) => {

                const responseHeaders = incomingMessage.headers;
                console.log(`Headers are: `)
                console.log(responseHeaders);
                const messageStatusCode = incomingMessage.statusCode;

                let responseBuffer = Buffer.alloc(0);

                let responseBody = '';  // Store the incoming chunks

                // Event listener for receiving data
                incomingMessage.on('data', (chunk : Buffer) => {
                    responseBuffer = Buffer.concat([responseBuffer, chunk]);
                    responseBody += chunk;
                }); 

                incomingMessage.on('end', () => {
                    console.log('Response Body:', responseBody);
                    console.log('Logging buffer');
                    console.log(responseBuffer);
                    console.log("\n\nLinesSplitted");
                    const repsonseLines = responseBody.split('\n');
                    console.log(`Diff lines count: ${repsonseLines.length}`);
                    console.log(repsonseLines);


                    const totalBytes = responseBuffer.length;
                    console.log(`Total bytes transfered are: ${totalBytes}`);

                    let currIndex = 0;
                    const firstFour = responseBuffer.subarray(currIndex, 4);
                    const totalLineLength = parseInt(firstFour.toString(), 16);                    
                    console.log(`First four extracted things are: ${firstFour} in interger: ${parseInt(firstFour.toString(), 16)}`);
                    const extractedLine = responseBuffer.subarray(currIndex, totalLineLength);
                    console.log(`Extract the next length`);
                    console.log(extractedLine.toString('hex'));
                    console.log(extractedLine.toString('base64'));
                    console.log(extractedLine.toString('utf-8'));

                    // for (const line of repsonseLines) {
                    //     const bufferLine = Buffer.from(line);
                    //     const lineLenBytes = bufferLine.subarray(0,4);
                    //     console.log(`Buffer Line: ${bufferLine} and Length: ${lineLenBytes} ${lineLenBytes.toString()} Testing: ${line.length}`);

                    // }




                    // You can now work with the full response body here
                    //!I think this is the correct thing for the first message. Need a way to decode the second one. 
                    //!                    



                });



//                console.log(incomingMessage);
            });
//        GET $GIT_URL/info/refs?service=git-upload-pack



        //!Client implementation
        //!Req 1 --> Run HTTPS GET request to connect to endpoint
        //Req 2 --> Run HHTPS POST request 

        //!What to do:
        //1. Using the smart protocol
        

//         //!Downloading the data
//         Client will run the fetch pack and server will run the upload-pack


//         //!Implementing this


//         TTP(S)
// The handshake for a fetch operation takes two HTTP requests. The first is a GET to the same endpoint used in the dumb protocol:

// => GET $GIT_URL/info/refs?service=git-upload-pack
// 001e# service=git-upload-pack
// 00e7ca82a6dff817ec66f44342007202690a93763949 HEAD□multi_ack thin-pack \
// 	side-band side-band-64k ofs-delta shallow no-progress include-tag \
// 	multi_ack_detailed no-done symref=HEAD:refs/heads/master \
// 	agent=git/2:2.1.1+github-607-gfba4028
// 003fca82a6dff817ec66f44342007202690a93763949 refs/heads/master
// 0000
// This is very similar to invoking git-upload-pack over an SSH connection, but the second exchange is performed as a separate request:

// => POST $GIT_URL/git-upload-pack HTTP/1.0
// 0032want 0a53e9ddeaddad63ad106860237bbf53411d11a7
// 0032have 441b40d833fdfa93eb2908e52742248faf0ee993
// 0000
// Again, this is the same format as above. The response to this request indicates success or failure, and includes the packfile.











    break;

    default:
        throw new Error(`Unknown command ${command}`);
}