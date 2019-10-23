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

FS.touch("/home/root/.hidden", rootIdent);
FS.write("/home/root/test1", "test1 : 1234567890abcdefghijklmnopqrstuvwxyz", rootIdent);
FS.write("/home/root/test2", "test2 : 1234567890abcdefghijklmnopqrstuvwxyz", rootIdent);
FS.write("/home/root/test3", "test3 : 1234567890abcdefghijklmnopqrstuvwxyz", rootIdent);
FS.write("/home/root/dir3/test4", "test4 : 1234567890abcdefghijklmnopqrstuvwxyz", rootIdent);

const apps = {
    ls: () => {
        const opts = {
            all: false,
            human: false,
            long: false,
            "no-group": false,
        };

        let count;
        let done = 0;

        const argMap = {
            a: "all",
            h: "human",
            l: "long",
            G: "no-group",
        };

        const start = data => {
            data = OS.Util.loadArgs(data, opts, argMap);
            count = data.length;
            data.map(list);

        }
        const list = path => {
            OS.FS.list(path)
                .then(data => output(path, data))
                .catch(e => error(path, e));
        }

        const error = (path, e) => {
            console.log(e);
            OS.Process.crash([path, e.toString()]);
        }

        const output = (path, data) => {
            if (!opts.all) {
                data = data.filter(d => !d.name.startsWith("."));
            }
            if (opts.human) {
                data.forEach(d => {
                    d.size = OS.Util.bytesToHuman(d.size);
                });
            }
            let result = null;
                result = opts.long ? longOutput(data) : shortOutput(data);

            OS.Std.out(result);

            done++;
            if (done >= count) {
                OS.Process.end();
            } else {

            }
        }

        const longOutput = data => {
            let arr = [
                ["perms", "user", opts["no-group"] ? "" : "group", "size", "name"].filter(c => c.length > 0)
            ];
            data = data.map(d => longOutputEntry(d,arr[0]));
            data = data.map(e => arr.push(e));
            return arr;
        }

        /**
         * 
         * @param {Object} entry 
         * @param {Array} columns 
         */
        const longOutputEntry = (entry, columns) => {
            return Object.entries(entry).filter(e => columns.includes(e[0])).map(e => e[1]);
        }

        const shortOutput = data => data.map(e => e.name);

        OS.Process.startEvent(start);
    },
}


FS.write("bin/ls", apps.ls.toString(), rootIdent);
FS.chmod("bin/ls", rootIdent, "755");



Processes.start("ls", ["-lh", "/home/root"], rootIdent)
    .then(data => console.log("App Started", data))
    .catch(error => console.log("App Failed", error));