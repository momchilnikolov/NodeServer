exports.methods = Object.create(null);
 
var {parse} = require("url");
var {resolve, sep, join} = require("path");

var baseDirectory = process.cwd();
const mime = require("mime");
const {createReadStream, createWriteStream, statSync } = require("fs");
const {stat, readdir } = require("fs").promises;
const {rmdir, unlink} = require("fs").promises;
const {mkdir} = require("fs").promises;

this.methods.GET = async function(request) {
  let path = mapUrl(request.url);
   
  let stats;
  try {
    stats = await stat(path);
  } catch (error) {
    if (error.code != "ENOENT") throw error;
    else return {status: 404, body: "File not found"};
  }
  if (stats.isDirectory()) {
    return {body: buildLinks((await readdir(path)), request.url)};
  } else {
    return {body: createReadStream(path),
            type: mime.getType(path)};
  }
};

this.methods.DELETE = async function(request) {
  let path = mapUrl(request.url);
  let stats;
  try {
    stats = await stat(path);
  } catch (error) {
    if (error.code != "ENOENT") throw error;
    else return {status: 204};
  }
  if (stats.isDirectory()) await rmdir(path);
  else await unlink(path);
  return {status: 204};
};

this.methods.PUT = async function(request) {
  let path = mapUrl(request.url);
  await pipeTo(request, createWriteStream(path));
  return {status: 204};
};

this.methods.MKCOL = async function(request) {
  let path = mapUrl(request.url);
  let stats;
  try {
    stats = await stat(path);
  } catch (error) {
    if (error.code != "ENOENT") throw error;
    await mkdir(path);
    return {status: 204};
  }
  if (stats.isDirectory()) return {status: 204};
  else return {status: 400, body: "Not a directory"};
};
function buildLinks(input, url) {
  let markup = `<style>th, td {
    padding: 10px;
  }
  </style><table><thead><tr><th>name</th>
  <th>is directory</th><th>size</th><th>modified time</th></tr></thead><tbody>`;
    const reducer = function (accumulator, currentValue) { 
 
      let joinedPath = join(url, currentValue);
      let stats = statSync(mapUrl(joinedPath));
      return accumulator + `<tr><td><a href="${ joinedPath }">${currentValue}</a></td>
        <td>${stats.isDirectory()}</td><td>${stats.size} bytes</td><td>${stats.mtime.toLocaleString()}</td></tr>`;
    }
    markup += input.reduce(reducer, "");
 
  markup += "</tbody></table>";
  return markup;
}

function pipeTo(from, to) {
  return new Promise((resolve, reject) => {
    from.on("error", reject);
    to.on("error", reject);
    to.on("finish", resolve);
    from.pipe(to);
  });
}


function mapUrl(url) {
  let {pathname} = parse(url);
  let path = resolve(decodeURIComponent(pathname).slice(1));
  if (path != baseDirectory &&
      !path.startsWith(baseDirectory + sep)) {
    throw {status: 403, body: "Forbidden"};
  }
  return path;
}
