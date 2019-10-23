import FS from "./FileSystem";
import Process from "../Struct/Process";

let libJS = null;

const getLib = async () => {
    const response = await fetch("osLib.bundle.js");
    return await response.text();
};

getLib()
    .then(data => { libJS = data.replace(/sourceMappingURL/g, ""); startPending(); })
    .catch(err => console.log("FETCH LIB ERROR", err));

const processes = {

};

let pids = 0;

const pending = [];

const startPending = () => {
    try {
        pending.forEach(pend => {
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

const getProcessFromSource = source => Object.values(processes).find(p => p.container.contentWindow === source) || null;

const OS = {
    FS: {
        list: (process, data) => FS.list(data, process.identity),
    },
    Process: {
        end: process => process.kill(),
    },
    Std: {
        out: (process, data) => process.hasParent() ? processes.intoParent(data) : OS.Out.printLn(data),
    },
    Out: {

    }
}

/**
 * @param {Process} process 
 * @param {Array} type 
 * @param {Object} data 
 */
const systemCall = (process, type, data) => {
    if (OS.hasOwnProperty(type[0])) {
        if (OS[type[0]].hasOwnProperty(type[1])) {
            return OS[type[0]][type[1]](process, data);
        }
    }
    console.log("Unhandled SysCall", process.id, type, data);
}

const appMessage = msg => {
    const process = getProcessFromSource(msg.source);
    if (processes === null) {
        return;
    }
    msg = msg.data;
    const type = msg.type;
    if (!(type instanceof Array)) {
        return;
    }
    /** @type {Process} */

    console.log("MSG FROM", process.id, type);
    if (type[0] === "boot") {
        process.respond(process.params, msg.id);
        return;
    }

    const p = systemCall(process, type, msg.data);
    const wantsPromise = (typeof msg.id === "string" && msg.id.length > 0);
    if (wantsPromise) {
        if (p instanceof Promise) {
            p.then(data => process.respond(data, msg.id));
        } else {
            throw ["Syscall Error", type, "did not return promise"];
        }
    }
}


window.addEventListener("message", appMessage);

export default {
    kill: killProcess,
    start: startProcess,
}