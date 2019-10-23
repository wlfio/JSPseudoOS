export default class Identity {
    constructor(user, groups, workingDir) {
        groups = groups || [];
        workingDir = workingDir || "/";

        this.user = user.toLowerCase();
        this.groups = [...groups, this.user]
            .filter((e, i, a) => a.indexOf(e) === i)
            .map(e => e.toLowerCase());
        this.workingDir = workingDir;
        this.setPriveledged(this.user === "root");
        this.path = ["/bin"];
    }

    addToPath(path) {
        this.path = [...this.path, path].filter((e, i, a) => a.indexOf(e) == i);
    }

    setPriveledged(priv) {
        this.priveledged = priv === true;
    }

    clone() {
        const ident = new Identity(this.user + "", [...this.groups], this.workingDir + "");
        ident.setPriveledged(this.priveledged === true);
        this.path.forEach(p => ident.addToPath(p + ""));
        return ident;
    }
}