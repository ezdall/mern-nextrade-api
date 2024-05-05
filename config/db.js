const mongoose = require('mongoose');

async function connectMDB() {
  const { MONGO_URI_NEXTRADE_PROD, MONGO_URI_NEXTRADE_DEV, NODE_ENV } =
    process.env;

  // use local-uri, if null or 'development'
  const mongoUri =
    NODE_ENV === 'production'
      ? MONGO_URI_NEXTRADE_PROD
      : MONGO_URI_NEXTRADE_DEV;

  try {
    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useUnifiedTopology: true,
      useFindAndModify: false
    });

    const { name, host, port } = conn.connection;

    console.log(
      `MongoDB Connected: ${host}:${port}/${name} pid:${process.pid}`
    );
  } catch (error) {
    console.error('Error-at-M.Connect:');
    console.error(error);

    process.exit(0); // exit 0-to clean exit, 1- app crash
  }
}

module.exports = { connectMDB };
