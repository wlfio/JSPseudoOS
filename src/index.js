import FS from "./Services/FileSystem";


const fh = new FS("root", [], "/");

try {
    fh.mkdir("bin");
} catch (e) {

}
fh.write("bin/add", "function(a,b){return a + b;}");