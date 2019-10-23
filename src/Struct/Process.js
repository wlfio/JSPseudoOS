import sha1 from "sha1";

const generateBlobURL = (data, type) => {
    const blob = new Blob([data], { type: type });
    return URL.createObjectURL(blob);
};

const blobs = {

};

const getBlobURL = (data, type) => {
    const sha = sha1(data);
    if (!blobs.hasOwnProperty(type)) {
        blobs[type] = {};
    }
    if (!blobs[type].hasOwnProperty(sha)) {
        blobs[type][sha] = generateBlobURL(data, type);
    }
    return blobs[type][sha];
}

const getJSBlobURL = data => getBlobURL(data, "text/javascript");

const getAppHtml = data => {
    if (!(data instanceof Array)) data = [data];
    let html = '<html><head><meta charset = "UTF-8">';
    data.forEach(d => html += ['<script src="', d, '"></scr', 'ipt>'].join(""));
    html += "</head><body></body></html>";
    return getBlobURL(html, "text/html");
};



export default class Process {
    constructor(id, exec, params, identity, parent) {
        this.id = id;
        this.exec = exec;
        this.setParams(params);
        this.setIdentity(identity);
        this.parent = parent || null;
        this.container = null;
        this.bin = [];
    }

    setIdentity(identity) {
        this.identity = identity.clone();
    }

    setParams(params) {
        if (params instanceof Array) {
            this.params = [...params];
        } else if (typeof params === "object") {
            this.params = JSON.parse(JSON.stringify(params));
        } else {
            this.params = params;
        }
    }

    hasParent() {
        return this.parent !== null;
    }

    loadBin(bin) {
        this.bin.push(getJSBlobURL(bin));
        return this;
    }

    spawn(bin) {
        this.container = document.createElement("iframe");
        this.container.sandbox = "allow-scripts allow-same-origin";
        this.container.id = "pid-" + this.id;
        document.querySelector("#processes").append(this.container);
        this.container.src = getAppHtml(this.bin);
    }

    setContainer(container) {
        this.container = container;
    }

    isSource(source) {
        return source === this.container.contentWindow;
    }

    message(type, data, id) {
        console.log("MSG TO", this.id, type.join(":"), data);
        this.container.contentWindow.postMessage({ type: type, data: data, id: id });
    }

    respond(data, id) {
        this.message(["response"], data, id);
    }

    kill() {
        this.container.parentNode.removeChild(this.container);
    }
}