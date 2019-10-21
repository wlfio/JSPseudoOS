
const list = (path, user) => {
    return getChildren(path);
};

const getChildren = path => {
    path = filePath(path) + "/";
    return Object.keys(localStorage).filter(p => p.startsWith(path));
}

const write = (path, content, user, group) => {
    let r = read(path);
    localStorage.setItem(filePath(path), content);
    if (r === null) {
        chmod(path, 5, 5, 4);
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

const chmod = (path, user, group, all) => {
    localStorage.setItem(permPath(path), [user, group, all].join(""));
}

const chown = (path, user, group) => {
    localStorage.setItem(owndPath(path), [user, group || user].join(":"));
}

const hasWrite

const filePath = path => "FS:" + fixPath(path);
const permPath = path => "FSP:" + fixPath(path);
const owndPath = path => "FSO:" + fixPath(path);

const fixPath = path => {
    if (path.indexOf("/") !== 0) {
        path = "/" + path;
    }
    return path;
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
    if (user === getUser(path)) {
        return true;
    }
    return false;
}

const groupHasPermission = (path, action, groups) => {
    if (groups.includes(getGroup(path))) {
        return true;
    }
    return false;
}

const anyHasPermission = (path, action, groups) => {
    if (groups.includes(getGroup(path))) {
        return true;
    }
    return false;
}

export default class FSHandler {
    constructor(user, groups, path) {
        this.user = user;
        this.groups = groups;
        this.workingDir = path;
    }

    setWorkingDir(path) {
        this.workingDir = path;
    }

    read(path) {
        this.permissionCheck(path, "read");
        return read(this.workingDir + "/" + path);
    }

    write(path, content) {
        this.permissionCheck(path, "write");
        return write(this.workingDir + "/" + path);
    }

    permissionCheck(path, action) {
        if (!this.hasPermission(path, action)) {
            throw ["Permission Error", action, path].join(" : ");
        }
    }

    hasPermission(path, action) {
        return hasPermission(path, action, this.user, this.group);
    }
}
