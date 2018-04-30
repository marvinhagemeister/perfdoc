function myFunc(nb) {
  return nb + nb;
}

let res = "";
for (var i = 0; i < 2000; ++i) {
  res += myFunc(i);
}
for (var i = 0; i < 20000; ++i) {
  res += myFunc(i + "");
}

for (var i = 0; i < 20000; i++) {
  if (res) {
    res += 3;
  }
}

return res.length + "";
