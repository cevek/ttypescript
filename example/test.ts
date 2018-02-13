const a = { b: 1 };
declare function safely(a: any): void;

function abc() {
    const c = safely(a.b);
}
console.log(abc.toString());
