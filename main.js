 
const {createServer} = require("http");
const { methods } = require("./services/service");

createServer((request, response) => {
  let handler = methods[request.method] || MethodNotImplemented;
  handler(request)
    .catch(error => {
      if (error.status != null) return error;
      return {body: String(error), status: 500};
    })
    .then(({body, status = 200, type = "text/html"}) => {
       response.writeHead(status, {"Content-Type": type});
       if (body && body.pipe) body.pipe(response);
       else response.end(body);
    });
}).listen(8080);

async function MethodNotImplemented(request) {
  return {
    status: 501,
    body: `Method ${request.method} is not implemented.`
  };
}
