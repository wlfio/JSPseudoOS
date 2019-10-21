import FS from "./Services/FileSystem";

FS.write("bob/pets/cat","meow");
FS.write("bob/pets/dog","woof");
FS.write("bob/name","bob");
FS.write("bob/age","10");

console.log(FS.read("bob/age"));
console.log(FS.read("bob/pets/dog"));
console.log(FS.list("bob/pets"));
FS.del("bob/age");
FS.delr("bob/pets");