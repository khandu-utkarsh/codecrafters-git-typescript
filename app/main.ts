import * as fs from 'fs';
import * as zlib from 'zlib';
import * as crypto from 'crypto';

const args = process.argv.slice(2);
const command = args[0];

enum Commands {
    Init = "init",
    Cat_file = "cat-file",
    Hash_object = "hash-object"

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
            const readPath = ".git/objects/" + dirName + "/" + fielName;
            const readContentBuffer = fs.readFileSync(readPath); 
            let unzippedData : string = zlib.unzipSync(readContentBuffer).toString();
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

    


    default:
        throw new Error(`Unknown command ${command}`);
}
