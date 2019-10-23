import FS from "./FileSystem";
import Process from "../Struct/Process";

let libJS = null;

const getLib = async () => {
    const response = await fetch("osLib.bundle.js");
    return await response.text();
};

getLib()
    .then(data => { libJS = data; startPending(); })
    .catch(err => console.log("FETCH LIB ERROR", err));

const processes = {

};

let pids = 0;

const pending = [];

const startPending = () => {
    try {
        pending.forEach(pend => {
            console.log(pend);
            startProcess(pend.args[0], pend.args[1], pend.args[2], pend.args[3])
                .then(pend.resolve)
                .catch(pend.reject);
        });
    } catch (e) {
        console.log("START PEND ERROR", e);
    }
};

const pendStart = (exec, params, identity, parent) => {
    return new Promise((resolve, reject) => {
        pending.push({
            args: [
                exec,
                params,
                identity,
                parent,
            ],
            resolve: resolve,
            reject: reject,
        });
    });
};

const startProcess = (exec, params, identity, parent) => {
    if (libJS === null) {
        return pendStart(exec, params, identity, parent);
    }
    identity = identity || parent.identity;
    //const frame = document.createElement('iframe');
    try {
        return new Promise((resolve, reject) => {
            FS.execRead(exec, identity)
                .then(data => {
                    const execPath = data[0];
                    const code = data[1];
                    pids++;

                    const process = new Process(pids, execPath, params, identity, parent);

                    process.loadBin(libJS);
                    process.loadBin("(" + code + ")();");

                    processes[pids] = process;

                    process.spawn();
                    resolve([process.id, process.exec, process.params]);
                })
                .catch(e => reject(e));
        });
    } catch (e) {
        console.log(["Process Error", e]);
        return Promise.reject(["Process Error", e]);
    }
};

const killProcess = processID => {
    if (!pid.startsWith("#pid-")) {
        if (!pid.startsWith("pid-")) {
            pid = "#pid-" + pid;
        } else {
            pid = "#" + pid;
        }
    }
}

const getProcessFromSource = source => Object.values(processes).find(p => p.container.contentWindow === source);

const messageApp = (processes, type, data, id) => {

}

const OS = {
    FS: FS,
}

const appMessage = msg => {
    if (msg.data.type.startsWith("webpack")) return;
    const process = getProcessFromSource(msg.source);
    console.log(msg.data, processes);
}


window.addEventListener("message", appMessage);

export default {
    kill: killProcess,
    start: startProcess,
}