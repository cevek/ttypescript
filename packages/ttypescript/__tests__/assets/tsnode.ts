
function type<T>() {
    return '';
}
const x = type<{ abc: 1 }>();
console.log(x);
