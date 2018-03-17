const Sequelize = require('sequelize');

const {models} = require('./model');
const {log, biglog, errorlog, colorize} = require('./out');



exports.helpCmd = (rl) => {
	log('Comandos:');
	log('h|help - Listado de comandos');
	log("list - muestra todas las preguntas con su identificador");
	log("show<id> - muestra la pregunta y la respuesta asociada al identificador");
	log("add - añade un nuevo quiz al programa");
	log("delete <id> - elimina del programa el quiz asociado al identificador");
	log("edit <id> - edita la pregunta y la respuesta asociada al identificador");
	log("test <id> - prueba el quiz asociado al identificador");
	log("p|play - permite responder a todas las preguntas hasta que se falla una");
	log("credits - muestra el nombre del/los autor/es");
	log("q|quit - termina la ejecución del programa");
	rl.prompt();
};

exports.quitCmd = rl => {
	rl.close();
	rl.prompt();
};

const makeQuestion = (rl, text) => {
	return new Sequelize.Promise((resolve, reject) => {
		rl.question(colorize(text, 'red'), answer => {
			resolve(answer.trim());
		});
	});

};


exports.addCmd = rl => {
	makeQuestion(rl, 'Introduzca una pregunta: ')
	.then(q => { //Q es como si hicieramos un metodo que recibe (string q)
		return makeQuestion(rl, 'Introduzca una respuesta: ')
		.then(a => {
			return {question: q, answer: a};
		});
	})
	.then(quiz => {
		return models.quiz.create(quiz);
	})
	.then(quiz => {
		log(`${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
	})
	.catch(Sequelize.ValidationError, error => {
		errorlog('El quiz no es valido');
		error.errors.forEach(({message}) => errorlog(message));
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then(() => {
		rl.prompt();
	});
};

exports.listCmd = rl => {

	models.quiz.findAll() //voy a models y cojo el quizz y llamo a la promesa findall
	.then(quizzes =>  { //Tomo como parametro todos los quizzes que he cogido
		quizzes.forEach(quiz => {
			log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
		});
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then(() => {
		rl.prompt();
	})
};



const validateId = id => {
	return new Promise((resolve, reject) => {
		if(typeof id === "undefined") {
			reject(new Error(`Falta el parametro <id>.`));
		} else {
			id = parseInt(id); // coge la parte entera
			if(Number.isNaN(id)) {
				reject(new Error(`El valor del parametro <id> no es un mumero`));
			} else {
				resolve(id);
			}
		}
	});
};
exports.showCmd = (rl, id) => {
	
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if(!quiz) { //compruebo que me han pasado un quiz de verdad
			throw new Error(`No existe quiz asociado a id=${id}`);
		}
		log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`)
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then(() => {
		rl.prompt();
	}); 
	
};

exports.deleteCmd = (rl,id) => {
	validateId(id)
	.then(id => models.quiz.destroy({where: {id}}))
	.catch(error => {
		errorlog(error.message);
	})
	.then (() => {
		rl.prompt();
	});
};

exports.editCmd = (rl,id) => {
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if(!quiz) {
			throw new Error(`No existe quiz asociado a id=${id}`);
		}
			process.stdout.isTYY && setTimeout (() => {rl.write(quiz.question)}, 0);
			return makeQuestion(rl, 'Introduca la pregunta: ')
			.then (q => {
				process.stdout.isTYY && setTimeout (() => {rl.write(quiz.answer)}, 0);
				return makeQuestion(rl, 'Introduzca la respuesta: ')
				.then (a => {
					quiz.question = q;
					quiz.answer = a;
					return quiz;
				});
			});
	})
	.then (quiz => {
		return quiz.save();
	})
	.then(quiz => {
		log(` Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`)
	})
	.catch(Sequelize.ValidationError, error => {
		errorlog('El quiz no es valido');
		error.errors.forEach(({message}) => errorlog(message));
	})
	.catch (error => {
		errorlog(error.message); 
	})
	.then(() => {
		rl.prompt();
	});


			
};

exports.testCmd = (rl,id) => {
	if (typeof id === "undefined") {
		errorlog(`Falta el parámetro id.`);
		rl.prompt();
	} else {
		try {
			const quiz = model.getByIndex(id);
			rl.question(colorize(`${quiz.question}? `,'red'), resp => {
				
				resp.trim();
				quiz.answer = quiz.answer.replace(/á/gi,"a");
				quiz.answer = quiz.answer.replace(/é/gi,"e");
				quiz.answer = quiz.answer.replace(/í/gi,"i");
				quiz.answer = quiz.answer.replace(/ó/gi,"o");
				quiz.answer = quiz.answer.replace(/ú/gi,"u");
			   	//quiz.answer = quiz.answer.replace(/ñ/gi,"n");

			   	if(resp === quiz.answer.toLowerCase()){
			   		log("Su respuesta es correcta");
			   		biglog('CORRECTO', 'green');


			   	} else {
			   		log("Su respuesta es incorrecta");
			   		biglog('INCORRECTO', 'red');
					
			   	}
				rl.prompt();
			   	
			   });

		} catch(error){
			errorlog(error.message);
			rl.prompt();
		}
		
	}

};

exports.playCmd = rl => {
	let score = 0;
	let toBeResolve = [];
	let numPreguntas = model.count();
	toBeResolve.lenght = numPreguntas;
	let i;


	for (i=0; i<numPreguntas; i++){

			toBeResolve[i]=i;
		}


		if (toBeResolve.lenght === 0 ){
			log("Ninguna pregunta para mostrar");
			log(`Llevas '${score}' puntos`);
			rl.prompt();
		} 

	const playOne = () => {
	
	try { 
			//Elige id al azar
		var idAzar = Math.floor(Math.random()*(toBeResolve.lenght-score)); 
		var id = toBeResolve[idAzar];

		var quiz = model.getByIndex(id);
		
			rl.question(colorize(`${quiz.question}? `,'red'), resp => {

				resp.trim();
				quiz.answer = quiz.answer.replace(/á/gi,"a");
				quiz.answer = quiz.answer.replace(/é/gi,"e");
				quiz.answer = quiz.answer.replace(/í/gi,"i");
				quiz.answer = quiz.answer.replace(/ó/gi,"o");
				quiz.answer = quiz.answer.replace(/ú/gi,"u");

				if(resp === quiz.answer.toLowerCase()){
					
					score += 1;
					log('CORRECTO', 'green');
					log(`Llevas'${score}' puntos`);
					
					if(score===numPreguntas){

						biglog(' :)   HAS   GANADO!!!!', 'green');
						rl.prompt();
						
					}else{
						toBeResolve.splice(idAzar, 1);
						playOne();
					}
					

				} else {
					log('INCORRECTO', 'red');
					log(`FIN DEL JUEGO. Has conseguido'${score}' puntos. Puedes volver a empezar`);
				}

			});
		} catch (error) {
			errorlog(error.message);
			rl.prompt();

		}	
}

playOne();

};

exports.creditsCmd = rl => {
	log("Mostrar los autores:");
	log('Beatriz Esteban Navarro');
	rl.prompt();
};
