exports.handler =  async function(event, context) {
    let eventBody = JSON.parse(event.body);
    return {
        statusCode: 200,
        body: eventBody.title + " man..."
    };
  }