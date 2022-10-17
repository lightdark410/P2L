const express = require('express');

const PORT = process.env.PORT || 8090;
const app = express();
const session = require('express-session');

const mainController = require('./controllers/mainController');
const apiController = require('./controllers/apiController');


app.set('view engine', 'ejs');

app.use('/assets', express.static('assets'));
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));

app.use(express.urlencoded({
	extended: true
  }));

app.use(express.json());

mainController(app);
apiController(app);

app.listen(PORT, () => {
	console.log("Server is listening on port %d", PORT);
});

process.on("SIGTERM", () => {
	console.log("Received SIGTERM: closing HTTP server.");
	// TODO: close DB connection pool
	server.close(() => {
		console.log("HTTP server closed");
	})
})
