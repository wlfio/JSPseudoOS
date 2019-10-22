import 'babel-polyfill';
import FS from "./Services/FileSystem";
import Identity from "./Struct/Identity";
import Processes from "./Services/Processes";

const rootIdent = new Identity("root", [], "/");

FS.mkdir("/", rootIdent);
FS.mkdir("/bin", rootIdent);

FS.write("bin/ls", (() => { console.log("ls"); }).toString(), rootIdent);

FS.chmod("bin/ls", rootIdent, "755");

Processes.start("ls", {}, rootIdent)
    .then(data => console.log("App Started", data))
    .catch(error => console.log("App Failed", error));