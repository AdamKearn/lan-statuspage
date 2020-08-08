const network = require('network-list');
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('db.json')
const db = low(adapter)

db.defaults({ devices: [] })
  .write()

function addDevice(device) {
  db.get('devices')
    .push({
      mac: device.mac,
      ip: device.ip,
      hostname: device.hostname,
      alive: device.alive
    })
    .write()
}

function scanNetwork() {
  return new Promise(async function(resolve, reject) {
    network.scan({}, (err, devices) => {
      resolve(devices);
    });
  });
}

async function main() {
  const connections = await scanNetwork();
  const knownDevices = db.get('devices').value()

  // Set all devices to offline
  knownDevices.forEach((device, d) => {
     db.get('devices').find({ mac: device.mac }).assign({alive: false}).write();
  });

  connections.forEach((possibleHost, pH) => {
    if ( possibleHost.mac !== null ) {
      const isInTheDB = db.get('devices').find({ mac: possibleHost.mac }).value()
      if ( isInTheDB === undefined ) {
        if (possibleHost.alive) {
          addDevice(possibleHost)
        }
      } else {
        // MAC is in the DB
        if (possibleHost.alive) {
          db.get('devices')
            .find({ mac: possibleHost.mac })
            .assign({
              alive: true,
              ip: possibleHost.ip,
              hostname: possibleHost.hostname
            })
            .write()
        } else {
          db.get('devices')
            .find({ mac: possibleHost.mac })
            .assign({
              alive: false,
              ip: possibleHost.ip,
              hostname: possibleHost.hostname
            })
            .write()
        }
      }
    } else {
      // does not have a mac address.

    }
  });
}

main();
