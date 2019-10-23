import 'babel-polyfill';
import FS from "./Services/FileSystem";
import Identity from "./Struct/Identity";
import Processes from "./Services/Processes";

const rootIdent = new Identity("root", [], "/");

FS.mkdir("/", rootIdent);
FS.mkdir("/bin", rootIdent);

FS.mkdir("/home", rootIdent);
FS.mkdir("/home/guest", rootIdent);

FS.mkdir("/home/root", rootIdent);
FS.mkdir("/home/root/dir1", rootIdent);
FS.mkdir("/home/root/dir2", rootIdent);
FS.mkdir("/home/root/dir3", rootIdent);
FS.mkdir("/home/root/dir3/dir4", rootIdent);

FS.touch("/home/root/test1", rootIdent);
FS.touch("/home/root/test2", rootIdent);
FS.touch("/home/root/test3", rootIdent);
FS.touch("/home/root/dir3/test4", rootIdent);

FS.write("bin/ls", (() => { console.log("ls"); }).toString(), rootIdent);
FS.chmod("bin/ls", rootIdent, "755");

Processes.start("ls", {}, rootIdent)
    .then(data => console.log("App Started", data))
    .catch(error => console.log("App Failed", error));