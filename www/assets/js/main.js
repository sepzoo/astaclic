$.noConflict();

var pagina_attuale = 'dashboard';

jQuery(document).ready(function ($) {

	"use strict";

	[].slice.call(document.querySelectorAll('select.cs-select')).forEach(function (el) {
		new SelectFx(el);
	});

	jQuery('.selectpicker').selectpicker;


	$('#menuToggle').on('click', function (event) {
		$('body').toggleClass('open');
	});

	$('.search-trigger').on('click', function (event) {
		event.preventDefault();
		event.stopPropagation();
		$('.search-trigger').parent('.header-left').addClass('open');
	});

	$('.search-close').on('click', function (event) {
		event.preventDefault();
		event.stopPropagation();
		$('.search-trigger').parent('.header-left').removeClass('open');
	});

	$('#button-table-aste').on('click', function () {
		AppName.changePage('aste-table', AppName.goAsteTable);
		// $('#dashboard').hide();
		// $('#aste-table').show();
		// pagina_attuale = 'aste-table';
		// AppName.addAsteTable(AppName.aste);
	})

	$('#button-dashboard').on('click', function () {
		AppName.changePage('dashboard', AppName.goDashboard, AppName.stopLoading)
	})

	var AppName = {
		aste: [],
		socket: null,
		init: function () {
			/**
			 * Click per attivare la 
			 *      FUNZIONE DI LOGOUT
			 */
			$("#logout_buttons button").on("click", function () {
				AppName.logout_function();
				// do something
			});
		},

		goDashboard: function (page, next) {
			console.log('go dashboard')
			$.get('/aste-attive', function (data) {
				console.log(data)
				AppName.addAsteDashboard(data);
				pagina_attuale = 'dashboard';
				next(page);
			})

			// $.ajax({
			// 	url: '/aste-attive',
			// 	type: "get",
			// 	async: false,
			// 	success: function (data) {
			// 		console.log(data)
			// 		AppName.addAsteDashboard(data);
			// 		pagina_attuale = 'dashboard';
			// 	},
			// 	error: function () {
			// 		console.log('errore')
			// 	}
			// })

			console.log('fine go dash')
		},

		goAsteTable: function () {
			console.log('go aste table');
			$.get('/aste-table', function (data) {
				AppName.addAsteTable(data);
				pagina_attuale = 'aste-table';
			})
		},

		stopLoading: function (page) {
			$('#loading').hide();
			$('#' + page).show();
		},

		changePage: function (page, callback_function, next) {
			console.log(pagina_attuale)
			$('#' + pagina_attuale).hide();
			$('#loading').show();
			pagina_attuale = 'loading';

			callback_function(page, next);
		},

		getSession: function (callback_function) {
			$.get("/session", callback_function);
		},

		/**
		 * FUNZIONE per 
		 *      COLLEGARSI al SERVER
		 */
		connection_server: function (token, callback) {

			console.log("Connessione in Corso...");
			socket = io();
			socket.on("connect", function () {
				socket
					.emit("authenticate", { token: token })
					.on("authenticated", callback)
					.on("unauthorized", function (msg) {
						console.error(msg);
					})
			});
		},

		getValueFromLogin: function (username, password) {

			username = $('#formLoginUsername').val();
			password = $('#formLoginPassword').val();
			AppName.username = username;

			$.post("/login", { nickname: username, password: password }, function (data) {
				console.log("/login", data)
				if (data.result) {
					//se il login vaa buon fine ed ho il token, lo uso per aprire la connessione
					AppName.connection_server(data.token, function () {
						// fai qualcosa quando la connessione è stata stabilita.
					});
				}
				else {
					console.log("Username o Password Sbagliata!");
					if (data.notRegistered) {

					}
					// Visualizzi un messaggio di errore per i dati sbagliati. 
				}

				if (data === 'done') {
					console.log("Richiesta effettuata con successo. Data = " + data)
				}
			});
		},

		// Funzione che server per verificare se la sessione esiste già
		checkSessionLogin: function (data) {
			if (data.token) {
				// la sessione esiste perchè il token è stato creato.
				console.log("/session", data);
				AppName.username = data.nickname;
				AppName.connection_server(data.token, function () {
					// fai qualcosa dopo aver stabilito la connessione con il server.
				});
			}
			else {
				// fai qualcosa se il token non è stato creato, quindi la sessione non esiste.
			}
		},

		/**
		 * FUNZIONE per 
		 *      LOGGARSI sul SITO.
		 */
		logging: function () {
			var username;
			var password;

			$("#accedi").on("click", function () {
				// Tramite questa funzione si fa il Login
				AppName.getValueFromLogin(username, password);
			});

			AppName.getSession(function (data) {
				AppName.checkSessionLogin(data);
			});

		},

		/**
		 * FUNZIONE per
		 *      LOGOUT
		 */
		logout_function: function () {
			socket.emit("logout_event", socket.id);
			console.log("Client -> socket:", socket.id);
			$.post("/logout", function (data) {
				console.log("Client -> Risposta", data);
				console.log("Client -> Sessione distrutta(?)");
			});
		},

		sortByDate: function () {
			$('#dashboard-table').tablesorter({
				dataFormat: "uk",
				sortList: [[1, 0]]
			})
		},

		addAsteDashboard: function (data) {
			AppName.aste = data;
			$('#table-dashboard-body').empty();
			data.forEach(function (snap) {
				var element =
					$('<tr>\
					<th scope="row">'+ snap.title + '</th>\
					<td>'+ snap.fine + '</td>\
					<td>'+ snap.stato + '</td>\
				</tr>');

				$('#table-dashboard-body').append(element);
			});
			AppName.sortByDate();
		},

		addAsteTable: function () {
			AppName.aste.forEach(function (snap) {
				var element = $(
					'<tr>\
					<th scope="row">'+ snap.title + '</th>\
					<td>'+ snap.fine + '</td>\
					<td>'+ snap.vincitore + '</td>\
					<td>'+ snap.rilancio_minimo + '</td>\
					<td>'+ snap.valore_attuale + '</td>\
					<td>'+ snap.stato + '</td>\
					<td>\
                     <button class="btn btn-outline-success">Vai</button>\
                    </td>\
				</tr>');

				$(element).on('click', function () {
					$('#aste-table').hide();
					$('#aste-info').show();

					pagina_attuale = 'aste-info';

					var cardBody =
						'<div class="card-header">\
                        <strong>Info asta</strong>\
                    </div>\
						<div class="card-body">\
					 Titolo: '+ snap.title + ' <br>\
					 Fine: ' + snap.fine + '<br>\
					 Vincitore: ' + snap.vincitore + '<br>\
					 Valore: ' + snap.valore_attuale + '<br>\
					 Rilancio: ' + snap.rilancio_minimo + '<br>\
					 Stato: ' + snap.stato + '<br>\
					</div>';

					$('#card-info-asta').empty();
					$('#card-info-asta').append(cardBody);
				})

				$('#table-aste-body').append(element);
			});

			$.fn.dataTable.moment('dd, MM Do, YYYY');
			$('#bootstrap-data-table').dataTable();
		},
	};

	AppName.init();
	AppName.logging();
});