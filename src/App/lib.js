
delete window.localStorage;
delete window.sessionStorage;

const hooks = {};
const calls = {};
const uuid4 = () => {
    function hex(s, b) {
        return s +
            (b >>> 4).toString(16) +  // high nibble
            (b & 0b1111).toString(16);   // low nibble
    }

    let r = crypto.getRandomValues(new Uint8Array(16));

    r[6] = r[6] >>> 4 | 0b01000000; // Set type 4: 0100
    r[8] = r[8] >>> 3 | 0b10000000; // Set variant: 100

    return r.slice(0, 4).reduce(hex, '') +
        r.slice(4, 6).reduce(hex, '-') +
        r.slice(6, 8).reduce(hex, '-') +
        r.slice(8, 10).reduce(hex, '-') +
        r.slice(10, 16).reduce(hex, '-');
};

const response = message => {
    const type = (message.data.type instanceof Array) ? message.data.type.join(":") : message.data.type;
    if (type === "response") {
        if (calls.hasOwnProperty(message.data.id)) {
            const prom = calls[message.data.id];
            if (message.data.hasOwnProperty("error")) {
                prom.reject(message.data.error);
            } else {
                prom.resolve(message.data.data);
            }
            delete calls[message.data.id];
        }
    } else {
        if (hooks.hasOwnProperty(type)) {
            let p = hooks[type].forEach(hook => hook(message.data.data));
            if (p instanceof Promise) {
                p.then(data => msg("response", data, message.data.id));
            } else {
                libJSPseudoOS.Process.crash("Hook [" + type + "] did not return Promise");
            }
        }
    }
}

const msg = (type, data, id) => {
    window.parent.postMessage({ type: type, data: data, id: id });
}

const request = (type, data) => {
    const id = uuid4();
    return new Promise((resolve, reject) => {
        calls[id] = { resolve: resolve, reject: reject };
        msg(type, data, id);
    });
}

window.addEventListener("message", response);

const hookEvent = (event, cb) => {
    return new Promise((resolve, reject) => {
        request([event[0], event[1]])
            .then(data => {
                event = event.join(":");
                if (!hooks.hasOwnProperty(event)) {
                    hooks[event] = [];
                }
                hooks[event] = [...hooks[event], cb];
                resolve(data);
            })
            .catch(error => reject(error));
    });
}

libJSPseudoOS = {
    FS: {
        read: path => request(["FS", "read"], path),
        write: (path, content) => request(["FS", "write"], { path: path, content: content }),
        list: path => request(["FS", "read"], path),
        mkdir: path => request(["FS", "mkdir"], path),
        touch: path => request(["FS", "touch"], path),
        del: path => request(["FS", "del"], path),
    },
    Std: {
        out: data => request(["Std", "out"], data),
        inEvent: cb => hookEvent(["Std", "in"], cb),
    },
    Out: {
        print: msg => request(["Out", "print"], { txt: msg, over: 0 }),
        printLn: msg => OS.Out.print(msg + "\n"),
        printOver: (msg, over) => request(["Out", "printOver"], { txt: msg, over: over }),
    },
    Process: {
        startEvent: cb => hookEvent(["Process", "start"], cb),
        msgEvent: cb => hookEvent(["Process", "msg"], cb),
        msg: (pid, msg) => request(["Process", "msg"], { pid: pid, msg: msg }),
        end: () => request(["Process", "end"]),
        crash: error => request(["Process", "crash"], error),
        ready: () => request(["Process", "ready"]),
        start: (exec, params) => request(["Process", "start"], { exec: exec, params: params }),
        kill: (pid) => request(["Process", "kill"], { pid }),
        list: () => request(["Process", "list"]),
    },
};
OS = libJSPseudoOS;


document.addEventListener("DOMContentLoaded", function (event) {
    msg("boot");
});