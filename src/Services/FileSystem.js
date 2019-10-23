const dirString = "___dir___";

const cleanSlash = str => str.replace(/\//g, '');

export const mkdir = (path, identity) => {
    try {
        path = resolvePath(path, identity);
        fileDirExistsCheck(path);
        fileNotExistsCheck(path);
        hasDirPermissionCheck(path, permBitWrit, identity);
        return Promise.resolve(doMkdir(path, identity));
    } catch (e) {
        return Promise.reject([...e]);
    }
}

const doMkdir = (path, identity) => {
    localStorage.setItem(dirPath(path), dirString);
    doChmod(path, permBitRead | permBitWrit | permBitExec, permBitRead | permBitExec, permBitRead | permBitExec);
    doChown(path, identity);
    return path;
}

export const touch = (path, identity) => write(path, "", identity);
export const write = (path, content, identity) => {
    try {
        path = resolvePath(path, identity);
        const exists = fileExists(path);
        if (exists) {
            hasPermissionCheck(path, permBitWrit, identity);
        } else {
            hasDirPermissionCheck(path, permBitWrit, identity);
        }
        return Promise.resolve(doWrite(path, content, exists, identity));
    } catch (e) {
        return Promise.reject([...e]);
    }
}

const doWrite = (path, content, exists, identity) => {
    exists = exists === true;
    localStorage.setItem(filePath(path), content);
    if (!exists) {
        doChmod(path, permBitRead | permBitWrit, permBitRead, permBitRead);
        doChown(path, identity);
    }
    return [path, content];
}

export const read = (path, identity) => {
    try {
        path = resolvePath(path, identity);
        fileExistsCheck(path);
        hasPermissionCheck(path, permBitRead, identity);
        return Promise.resolve(doRead(path));
    } catch (e) {
        return Promise.reject([...e]);
    }
}

const doRead = path => localStorage.getItem(filePath(path));

export const del = (path, identity) => {
    try {
        path = resolvePath(path, identity);
        hasDirPermissionCheck(path, permBitWrit, identity);
        fileExistsCheck(path);
        return Promise.resolve(doDel(path));
    } catch (e) {
        return Promise.reject([...e]);
    }
}

const doDel = (path) => {
    localStorage.removeItem(filePath(path));
    localStorage.removeItem(permPath(path));
    localStorage.removeItem(owndPath(path));
    return path;
};

const getChildren = path => {
    const f = filePath(path);
    const d = dirPath(path);
    return Object.keys(localStorage)
        .filter(p => p.startsWith(f) || p.startsWith(d))
        .map(p => {
            p = p.split(":");
            return [p[0] === "FSF", p[1]];
        });
}

export const list = (path, identity) => {
    try {
        path = resolvePath(path, identity);
        hasPermissionCheck(path, permBitRead, identity);
        const paths = getChildren(path).map(p => listEntry);
        return Promise.resolve(paths);
    } catch (e) {
        return Promise.reject([...e]);
    }
}

const listEntry = path => {
    const dir = isDir(path);
    return [
        path,
        !dir,
        ...getPathOwners(path),
        getPermBits(path).toString(16),
        dir ? 0 : new Blob([doRead(path)]).size,
    ];
}

export const execRead = (exec, identity) => {
    return new Promise((resolve, reject) => {
        getExec(exec, identity)
            .then(path => {
                read(path, identity)
                    .then(data => resolve([path, data]))
                    .catch(e => reject(e));
            })
            .catch(e => reject(e));
    });
}

export const getExec = (exec, identity) => {
    try {
        exec = cleanSlash(exec);
        const paths = resolveExecPaths(exec, identity);
        for (let i = 0; i < paths.length; i++) {
            const path = paths[i];
            if (fileExists(path)) {
                if (hasPermission(path, permBitExec, identity)) {
                    return Promise.resolve(path);
                }
            }
        }
        throw ["FS Error", exec, "Not found"];
    } catch (e) {
        return Promise.reject([...e]);
    }
}

export const chmod = (path, identity, hex) => {
    path = resolvePath(path, identity);
    fileExistsCheck(path);
    if (typeof hex !== "string" || hex.length !== 3) {
        throw ["FS Error", "" + hex, "must be 3 digits long"]
    }
    const usr = parseInt("0x" + hex.charAt(0));
    const grp = parseInt("0x" + hex.charAt(1));
    const any = parseInt("0x" + hex.charAt(2));
    if (identity.priveledged || getPathUsr(path) === identity.user) {
        return doChmod(path, usr, grp, any);
    }
    throw ["FS ERROR", path, "Permissions can only be changed by root or owner"];
}

const doChmod = (path, usr, grp, any) => {
    let perms = 0;
    perms |= (usr << bitOffsetUsr);
    perms |= (grp << bitOffsetGrp);
    perms |= (any << bitOffsetAny);
    localStorage.setItem(permPath(path), "0x" + perms.toString(16));
}

export const chown = (path, identity, user, group) => {
    path = resolvePath(path, identity);
    fileExistsCheck(path);
    if (identity.priveledged) {
        return doChown(path, identity, user, group);
    }
    throw ["FS Error", "chown", "requires root"];
};

const doChown = (path, identity, user, group) => {
    localStorage.setItem(owndPath(path), [user || identity.user, group || identity.user].join(":"));
}

const fileExists = (path) => {
    return localStorage.hasOwnProperty(filePath(path));
}

const fileDirExistsCheck = (path) => {
    path = getFileDir(path);
    isDirCheck(path);
}

const isDirCheck = path => {
    if (!isDir(path)) {
        throw ["Access Error", "Path is not directory", path].join(" : ");
    }
}

const isDir = path => {
    if (path.length < 1 || path === "/") {
        return true;
    }
    return localStorage.getItem(dirPath(path)) === dirString;
}

const fileExistsCheck = (path) => {
    if (!fileExists(path)) {
        throw ["Access Error", "Path does not exist", path].join(" : ");
    }
}

const fileNotExistsCheck = (path) => {
    if (fileExists(path)) {
        throw ["Access Error", "Path exists", path].join(" : ");
    }
}

const filePath = path => path.indexOf("FSF:") !== 0 ? "FSF:" + fixPath(path) : path;
const dirPath = path => path.indexOf("FSD:") !== 0 ? "FSD:" + fixPath(path) : path;
const permPath = path => path.indexOf("FSP:") !== 0 ? "FSP:" + fixPath(path) : path;
const owndPath = path => path.indexOf("FSO:") !== 0 ? "FSO:" + fixPath(path) : path;

const fixPath = path => {
    return "/" + path.split("/").reduce((out, inp) => {
        if (inp.length > 0 && inp !== ".") {
            if (inp == "..") {
                out = out.slice(0, out.length - 1);
            } else {
                out = [...out, inp];
            }
        }
        return out;
    }, []).join("/");
}
const hasDirPermissionCheck = (path, action, identity) => hasPermissionCheck(getFileDir(path), action, identity);
const hasPermissionCheck = (path, action, identity) => {
    if (!hasPermission(path, action, identity)) {
        throw ["Permissions Error", "Denied " + permString(action), path].join(" : ");
    }
}

const permString = (action) => {
    let ps = "";
    if (action & permBitRead) ps += "r";
    if (action & permBitWrit) ps += "w";
    if (action & permBitExec) ps += "x";
    return ps;
}

const hasPermission = (path, action, identity) => {
    return (
        userHasPermission(path, action, identity)
        ||
        groupHasPermission(path, action, identity)
        ||
        anyHasPermission(path, action)
    );
}

const userHasPermission = (path, action, identity) => {
    const user = identity.user;
    if (identity.priveledged) {
        if (action & permBitExec) {
            return (
                (getPermBitsUsr(path) & permBitExec)
                ||
                (getPermBitsGrp(path) & permBitExec)
                ||
                (getPermBitsAny(path) & permBitExec)
            );
        }
        return true;
    }
    if (user === getPathUsr(path) && getPermBitsUsr(path) & action) {
        return true;
    }
    return false;
}

const groupHasPermission = (path, action, identity) => {
    const groups = identity.groups;
    if (groups.includes(getPathGrp(path)) && getPermBitsGrp(path) & action) {
        return true;
    }
    return false;
}

const anyHasPermission = (path, action, groups) => {
    if (getPermBitsAny(path) & action) {
        return true;
    }
    return false;
}

const getPathUsr = path => getPathOwners(path)[0];
const getPathGrp = path => getPathOwners(path)[1];

const getPathOwners = path => getPathOwnerString(path).split(":");
const getPathOwnerString = path => localStorage.getItem(owndPath(path)) || "nobody|nobody";

const permBitRead = 4;
const permBitWrit = 2;
const permBitExec = 1;

const bitOffsetUsr = 8;
const bitOffsetGrp = 4;
const bitOffsetAny = 0;

const getPermBitsUsr = path => getPermBits(path) >> bitOffsetUsr;
const getPermBitsGrp = path => getPermBits(path) >> bitOffsetGrp;
const getPermBitsAny = path => getPermBits(path) >> bitOffsetAny;

const getPermBits = (path) => parseInt(localStorage.getItem(permPath(path))) || 0;

const getFileDir = path => {
    path = path.split("/");
    path = path.slice(0, path.length - 1).join("/");
    return path;
}

const dirAccessCheck = (path, identity) => {
    path = getFileDir(path);
    path = path.split("/");
    for (let i = 2; i <= path.length; i++) {
        const p = path.slice(0, i).join("/");
        isDirCheck(p);
        hasPermissionCheck(p, permBitExec, identity);
    }
}

const slashWrap = path => {
    if (path.charAt(0) !== "/") {
        path = "/" + path;
    }
    if (path.charAt(path.length - 1) !== "/") {
        path += "/";
    }
    return path;
}

const resolveExecPaths = (exec, identity) => [resolvePath(exec, identity), ...identity.path.map(p => resolveWorkingPath(exec, p))];

const resolvePath = (path, identity) => {
    path = resolveWorkingPath(path, identity.workingDir)
    dirAccessCheck(path, identity);
    return path;
}

const resolveWorkingPath = (path, working) => {
    working = slashWrap(working || "/");
    path = path.trim();
    if (path.charAt(0) !== "/") {
        path = working + path;
    }
    path = fixPath(path);
    return path;
};

export default {
    read,
    write,
    del,
    list,
    touch,
    mkdir,
    getExec,
    execRead,
    chmod,
    chown,
};