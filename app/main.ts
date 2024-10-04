import * as fs from 'fs';
import * as zlib from 'zlib';
import * as crypto from 'crypto';

const args = process.argv.slice(2);
const command = args[0];

enum Commands {
    Init = "init",
    Cat_file = "cat-file",
    Hash_object = "hash-object",
    Ls_tree = "ls-tree"
}

function readObjectFile(hash: string): string {
    const dirName = hash.substring(0, 2);
    const fileName = hash.substring(2);
    const readPath = ".git/objects/" + dirName + "/" + fileName;
    const readContentBuffer = fs.readFileSync(readPath);
    const unzippedData: string = zlib.unzipSync(readContentBuffer).toString();
    return unzippedData;
}



//!For debugging
//console.log(args);
//console.log(command);

switch (command) {
    case Commands.Init:
        // You can use print statements as follows for debugging, they'll be visible when running tests.
        //console.log("Logs from your program will appear here!");

        // Uncomment this block to pass the first stage
        fs.mkdirSync(".git", { recursive: true });
        fs.mkdirSync(".git/objects", { recursive: true });
        fs.mkdirSync(".git/refs", { recursive: true });
        fs.writeFileSync(".git/HEAD", "ref: refs/heads/main\n");
        console.log("Initialized git directory");
        break;

    case Commands.Cat_file:
        const argument = args[1];
        const sha1str : string = args[2];
        const dirName = sha1str.substring(0,2);
        const fielName = sha1str.substring(2);

        if(argument === '-p')
        {
            let unzippedData = readObjectFile(sha1str);
            if(unzippedData.startsWith('blob'))
            {
                unzippedData = unzippedData.slice(5);
            }
            let startIndexOfContent : number = 0;
            for(let i = 0; i < unzippedData.length; ++i)
            {
                const code = unzippedData.charCodeAt(i);
                if(code >= 48 && code <= 57) continue;
                startIndexOfContent = i;
                break;
                //!
            }
            const blobContent = unzippedData.slice(startIndexOfContent + 1);    //! + 1 for skipping the null character
            process.stdout.write(blobContent);  //!Not using console.log since it will print out the null character at the end.
        }
        break;


    case Commands.Hash_object:
        if(args[1] === '-w')
        {
            const fileName = args[2];
            const fileContent = fs.readFileSync(fileName).toString();
            const computeString = 'blob ' + fileContent.length.toString() + '\0' + fileContent; 

            var shasum = crypto.createHash('sha1').update(computeString).digest('hex');
            process.stdout.write(shasum);
            const writePath = ".git/objects/" + shasum.slice(0,2) + "/"+ shasum.slice(2);
            //console.log("\n"+ writePath);
            fs.mkdirSync(".git/objects/" + shasum.slice(0,2), { recursive: true });
            fs.writeFileSync(writePath,zlib.deflateSync(computeString));
        }
        break;

    case Commands.Ls_tree:
        if(args[1] === "--name-only")
        {
            const hash = args[2];
            let unzippedData = readObjectFile(hash);
            //console.log(unzippedData);
            const firstNullIndex = unzippedData.indexOf('\0');
            const content = unzippedData.slice(firstNullIndex + 1);

            // Process the tree entries
            const entries = [];
            let currentIndex = 0;
            while (currentIndex < content.length) {
                // Find mode (up to the first space)
                const spaceIndex = content.indexOf(' ', currentIndex);
                const mode = content.slice(currentIndex, spaceIndex);

                // Find the null byte after the name (mode <name>\0...)
                const nameStartIndex = spaceIndex + 1;
                const nullIndex = content.indexOf('\0', nameStartIndex);
                const name = content.slice(nameStartIndex, nullIndex);

                console.log(name);

                // Extract the SHA (20 bytes starting after the null byte)
                const shaStartIndex = nullIndex + 1;
                const sha = content.slice(shaStartIndex, shaStartIndex + 20);

                // Add this entry to the list
                entries.push({ mode, name, sha });

                // Move the index to the next entry
                currentIndex = shaStartIndex + 20;
            }

            //console.log(entries);





        }
        break;

    default:
        throw new Error(`Unknown command ${command}`);
}
