
const list = (path, user) => {
    return getChildren(path);
};

const getChildren = path => {
    path = filePath(path);
    return Object.keys(localStorage)
        .filter(p => p.startsWith(path))
        .map(p => p.split(":").slice(1).join(":"));
}

const dirString = "___dir___";

const mkdir = (path, user, groups) => {
    dirAccessCheck(path, user, groups);
    fileDirExistsCheck(path);
    fileNotExistsCheck(path);
    hasDirPermissionCheck(path, permBitWrit, user, groups);
    localStorage.setItem(filePath(path), dirString);
    chmod(path, permBitRead | permBitWrit | permBitExec, permBitRead | permBitExec, permBitRead | permBitExec);
    chown(path, user);
}

const dirAccessCheck = (path, user, groups) => {
    if (path === "/") return;
    path = getFileDir(path);
    hasPermissionCheck(path, permBitExec, user, groups);
    dirAccess(path, user, groups);
}

const write = (path, content, user, group) => {
    dirAccessCheck(path, user, group);
    const dir = getFileDir(path);

    let exists = fileExists(path);
    if (exists) {

    } else {

    }
    localStorage.setItem(filePath(path), content);
    if (!exists) {
        chmod(path, permBitRead | permBitWrit, permBitRead, permBitRead);
        chown(path, user, group);
    }
}

const append = (path, content) => {
    write(path, read(path) + content);
}

const read = (path) => {
    return localStorage.getItem(filePath(path));
}

const del = (path) => {
    console.log("DEL:", path);
    localStorage.removeItem(filePath(path));
    localStorage.removeItem(permPath(path));
    localStorage.removeItem(owndPath(path));
}

const delr = (path) => {
    console.log(path, getChildren(path));
    getChildren(path).forEach(del);
}

const chmod = (path, usr, grp, any) => {
    let perms = 0;
    perms |= (usr << bitOffsetUsr);
    perms |= (grp << bitOffsetGrp);
    perms |= (any << bitOffsetAny);
    localStorage.setItem(permPath(path), "0x" + perms.toString(16));
}

const chown = (path, user, group) => {
    localStorage.setItem(owndPath(path), [user, group || user].join(":"));
}

const fileExists = (path) => {
    return localStorage.hasOwnProperty(filePath(path));
}

const fileDirExistsCheck = (path) => {
    path = getFileDir(path);
    fileExistsCheck(path);
    if (!localStorage.getItem(path) === dirString) {
        throw ["Access Error", "Path is not directory", path].join(" : ");
    }
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

const filePath = path => path.indexOf("FS:") !== 0 ? "FS:" + fixPath(path) : path;
const permPath = path => path.indexOf("FSP:") !== 0 ? "FSP:" + fixPath(path) : path;
const owndPath = path => path.indexOf("FSO:") !== 0 ? "FSO:" + fixPath(path) : path;

const fixPath = path => {
    console.log("fix", path);
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
const hasDirPermissionCheck = (path, action, user, groups) => hasPermissionCheck(getFileDir(path), action, user, groups);
const hasPermissionCheck = (path, action, user, groups) => {
    if (!hasPermission(path, action, user, groups)) {
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

const hasPermission = (path, action, user, groups) => {
    return (
        userHasPermission(path, action, user)
        ||
        groupHasPermission(path, action, groups)
        ||
        anyHasPermission(path, action)
    );
}

const userHasPermission = (path, action, user) => {
    if (user === "root") return true;
    if (user === getPathUsr(path) && getPermPitsUsr(path) & action) {
        return true;
    }
    return false;
}

const groupHasPermission = (path, action, groups) => {
    if (groups.includes(getPathGrp(path)) && getPermPitsGrp(path) & action) {
        return true;
    }
    return false;
}

const anyHasPermission = (path, action, groups) => {
    if (getPermPitsAny(path) & action) {
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

const getPermPitsUsr = path => getPermBits(path) >> bitOffsetUsr;
const getPermPitsGrp = path => getPermBits(path) >> bitOffsetGrp;
const getPermPitsAny = path => getPermBits(path) >> bitOffsetAny;

const getPermBits = (path) => parseInt(localStorage.getItem(permPath(path))) || 0;

const getFileDir = path => {
    path = path.split("/");
    path = path.slice(0, path.length - 1).join("/");
    return path;
}

mkdir("/", "root");

// mkdir("/test", "root");

const resolvePath = (path, working) => {
    working = working || "/";
    path = path.trim();
    if (path.charAt(0) !== "/") {
        path = "/" + working + "/" + path;
    }
    return fixPath(path);
}

class FSHandler {
    constructor(user, groups, path) {
        this.user = user;
        this.groups = groups;
        this.workingDir = "";
        this.setWorkingDir(path);
        this.groups = [...this.groups, user].filter((e, i, a) => a.indexOf(e) === i);
    }

    resolve(path) {
        return resolvePath(path, this.workingDir);
    }

    setWorkingDir(path) {
        this.workingDir = this.resolve(path) + "/";
    }

    read(path) {
        return read(this.resolve(path), user, groups);
    }

    write(path, content) {
        return write(this.resolve(path), content, this.user);
    }

    mkdir(path) {
        mkdir(this.resolve(path), this.user, this.groups);
    }

    del(path) {
        del(this.resolve(path), this.user, this.groups);
    }

    delr(path) {
        delr(this.resolve(path), this.user, this.groups);
    }
}

FSHandler.prototype.permWrite = permBitWrit;
FSHandler.prototype.permRead = permBitRead;
FSHandler.prototype.permExec = permBitExec;

export default FSHandler;