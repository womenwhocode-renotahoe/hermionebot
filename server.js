var restify = require('restify');
var builder = require('botbuilder');
var prompts = require('./prompts');

/** Use Hermione LUIS model for the root dialog. */
var model = 'https://api.projectoxford.ai/luis/v1/application?id=3e971f61-3f7f-4530-8c18-b101cf66c691&subscription-key=06b59642a973401097f347da3e7cd20f';
var dialog = new builder.LuisDialog(model);

// Get secrets from server environment
var botConnectorOptions = {
    appId: process.env.BOTFRAMEWORK_APPID,
    appSecret: process.env.BOTFRAMEWORK_APPSECRET
};

// Create bot
var bot = new builder.BotConnectorBot(botConnectorOptions);

bot.add('/', dialog);

dialog.on('Help', builder.DialogAction.send(prompts.helpMessage));

dialog.on('Hello', builder.DialogAction.send(prompts.helloMessage));

dialog.on('Cortana', builder.DialogAction.send(prompts.cortanaMessage));

dialog.on('Siri', builder.DialogAction.send(prompts.siriMessage));

dialog.on('Description', [askTopic, answerQuestion('description', prompts.answerDescription)]);

dialog.on('Snippet', [askTopic, answerQuestion('snippet', prompts.answerSnippet)]);

dialog.on('UseCase', [askTopic, answerQuestion('useCase', prompts.answerUseCase)]);

function askTopic(session, args, next) {
    // First check to see if we either got a topic from LUIS or have a an existing topic
    // that we can multi-turn over.
    var topic;
    var language;
    var topicEntity = builder.EntityRecognizer.findEntity(args.entities, 'Topic');
    var languageEntity = builder.EntityRecognizer.findEntity(args.entities, 'Language');

    if (topicEntity) {
        // The user specified a topic so lets look it up to make sure its valid.
        // * This calls the underlying function Prompts.choice() uses to match a users response
        //   to a list of choices. When you pass it an object it will use the intents as the
        //   list of choices to match against.
        topic = builder.EntityRecognizer.findBestMatch(data, topicEntity.entity);
    } else if (session.dialogData.topic) {
        // Just multi-turn over the existing Topic
        topic = session.dialogData.topic;
    }

    // Prompt the user to pick a topic if they didn't specify a valid one.
    if (!topic) {
        // Lets see if the user just asked for a topic we don't know about.
        var topicText = entity ? session.gettext(prompts.topicUnknown, { topic: entity.entity }) : prompts.topicMissing;

        // Prompt the user to pick a topic from the list. They can also ask to cancel the operation.
        builder.Prompts.choice(session, topicText, data);
    } else {
        // Great! pass the Topic to the next step in the waterfall which will answer the question.
        // * This will match the format of the response returned from Prompts.choice().
        next({ response: topic })
    }
}

function askLanguage() {
  // session.userData.language = results.response;
  // builder.Prompts.choice(session, "What language?", ["Ruby", "JavaScript", "Python"]);
  return 'Ruby';
};

function answerQuestion(field, answerTemplate) {
    return function (session, results) {
        // Check to see if we have a topic. The user can cancel picking a topic so IPromptResult.response
        // can be null.
        if (results.response) {
            // Save topic for multi-turn case and compose answer
            var topic = session.dialogData.topic = results.response;
            if (field == "snippet") {
              var language = askLanguage();
              var answer = { topic: topic.entity, value: data[topic.entity][field][language], language: language};
            }
            else {
              var answer = { topic: topic.entity, value: data[topic.entity][field] };
            }
            session.send(answerTemplate, answer);
        } else {
            session.send(prompts.cancel);
        }
    };
}

// Setup Restify Server
var server = restify.createServer();

// Handle Bot Framework messages
server.post('/api/messages', bot.verifyBotFramework(), bot.listen());

// Serve a static web page
server.get(/.*/, restify.serveStatic({
  directory: __dirname, 
	'default': 'index.html'
}));

server.listen(process.env.port || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

var data = {
  'Array': {
    description: 'An array is an ordered collection of objects. An array can contain several types of objects at once, such as integers, floats, strings, even other arrays or more complex objects.',
    snippet:  {
        Ruby: '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]',
        JavaScript: '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]',
        Python: '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]'
    },
    useCase: 'An array is useful when you simply need to store a list of objects, without needing the added complexity of something like a hash.'
  },
  'Iterator': {
    description: 'An iterator is way to process all the items in a list.',
    snippet: {
      Ruby: 'orders.each do |order| print order end',
      JavaScript: 'for (var counter = 1; counter < 6; counter++) { console.log(counter);',
      Python: 'for line in open("a.txt"): print line'
    },
    useCase: 'Iterators can loop through a collection of orders or items and execute a block of code.'
  },
  'Hash': {
    description: 'A hash is a collection of key-value pairs.',
    snippet: {
      Ruby: '{"a": "apple", "b": "banana", "c": ["cat", "canary"], "d": 42}',
      JavaScript: '{"a": "apple", "b": "banana", "c": ["cat", "canary"], "d": 42}',
      Python: '{"a": "apple", "b": "banana", "c": ["cat", "canary"], "d": 42}'
    },
    useCase: 'A hash is useful when you have a set of data that you want to organize by categories. In that case, you can set the categories as keys, and the data falling into that category can be the value.'
  },
  'Operator': {
    description: 'Operators in code perform assignments, arithmetic, comparisons, and much more!',
    snippet: {
  		JavaScript: 'voteable = (age < 18) ? "Too young":"Old enough";',
  		Ruby: 'puts 1 < 2 ? "One is less than two!" : "One is not less than two."',
  		Python: '>>> msg = "Hello %s" % name if name else "gimme your name"'
  	},
    useCase: 'You would use an Operator to do something to your variables.'
  },
  'Function': {
    description: 'A function is a block of code designed to perform a particular task.',
    snippet: {
      JavaScript: "var helloWorld = function() {\n" + "  console.log('Hello World');\n" + "}",
      Ruby: "def hello_world\n" + "  puts 'Hello World'\nend",
      Python: "def hello_world\n" + "  print 'Hello World'"
    },
    useCase: 'You call a function when you want the program to execute a particular task.',
  },
  'Variable': {
    description: 'A variable is a container for storing data values.',
    snippet: {
      JavaScript: 'var x = 2;',
      Ruby: 'x = 2',
      Python: 'x = 2'
    },
    useCase: "You would use a variable to store a piece of data that you want to reuse in multiple places."
  },
  'Ruby': 'Ruby',
  'Python': 'Python',
  'JavaScript': 'JavaScript'
};
