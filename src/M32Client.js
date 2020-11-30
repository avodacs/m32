const channelPersistence = require('./channelPersistance');
const debug = require('debug')('m32:M32Client');
const osc = require('osc');

class M32Client {
  constructor(ip, port, resolution) {
    this.initialize(ip, port, resolution);
  }

  initialize(ip, port, resolution) {
    this.ip = ip;
    this.port = port;
    this.resolution = resolution;
    this.intervals = [];
    this.subscriptionInterval = {};

    if (this.port === undefined) {
      this.port = 10023;
    }

    if (this.resolution === undefined) {
      this.resolution = 25;
    }

    this.channels = channelPersistence;
    this.lastMessage = null;

    this.udp = new osc.UDPPort({
      localAddress: '0.0.0.0',
      localPort: this.port,
      remoteAddress: this.ip,
      remotePort: this.port,
    });

    this.udp.on('error', function (error) {
      debug(`An error occurred: ${error.message}`);
    });

    this.udp.on('message', (oscMsg, timeTag, info) => {
      debug(`OSC Message: ${JSON.stringify(oscMsg)}`);

      let address = oscMsg.address;

      try {
        // Record the last message
        this.lastMessage = {
          message: oscMsg,
          when: Math.floor(Date.now() / 1000),
        };

        if (address.endsWith('/mix/fader')) {
          // Collect Fader Position Value
          let splitAddress = address.split('/');

          let channel = parseInt(splitAddress[2]);
          let value = oscMsg.args[0];

          this.channels.setFader(channel, value);
        } else if (address.endsWith('/mix/on')) {
          // Collect Fader Mute
          let splitAddress = address.split('/');

          let channel = parseInt(splitAddress[2]);
          let value = oscMsg.args[0];

          let isMuted = value === 0;

          debug(`Channel ${channel} is muted: ${isMuted}`);

          if (isMuted) {
            this.muteChannel(channel);
          } else {
            this.unmuteChannel(channel);
          }
        }
      } catch (err) {
        debug(err);
      }
    });

    debug(`Created M32 Client at ${ip}:${port}`);
  }

  stopAllIntervals() {
    debug('Stopping all existing intervals!');

    while (this.intervals.length > 0) {
      let thisInterval = this.intervals.shift();

      clearInterval(thisInterval);
    }
  }

  channelFix(channel) {
    if (channel < 10) {
      return `0${channel}`;
    } else {
      return `${channel}`;
    }
  }

  connect() {
    debug(`Connecting to M32 at ${this.ip}`);
    this.udp.open();
  }

  disconnect() {
    debug(`Disconnecting from M32 at ${this.ip}`);
    this.udp.close();
  }

  command(command, args) {
    debug(`Sending ${JSON.stringify(args)} to ${command}`);

    return new Promise((resolve, reject) => {
      this.udp.send({
        address: command,
        args,
      });

      resolve();
    });
  }

  // Fader Control
  getFaderValue(channel) {
    let fixedChannel = this.channelFix(channel);

    this.command(`/ch/${fixedChannel}/mix/fader`);
    this.command(`/ch/${fixedChannel}/mix/on`);
  }

  setFaderValue(channel, value) {
    let fixedChannel = this.channelFix(channel);

    this.channels.setFader(channel, value);

    this.command(`/ch/${fixedChannel}/mix/fader`, { type: 'f', value });
  }

  graduallySetFaderValue(channel, newValue, ms) {
    const currentValue = this.channels.get(channel).faderValue;
    const diff = Math.abs(currentValue - newValue);
    const steps = ms / this.resolution;
    const adjustmentAmount = diff / steps;

    // Calculate value tables
    let valueTable = [];

    if (currentValue < newValue) {
      for (let i = 0; i < steps; i++) {
        let newValueAtThisStep = currentValue + i * adjustmentAmount;

        valueTable.push(newValueAtThisStep);
      }

      if (valueTable[valueTable.length] !== newValue) {
        valueTable.push(newValue);
      }
    } else {
      for (let i = 0; i < steps; i++) {
        let newValueAtThisStep = currentValue - i * adjustmentAmount;

        valueTable.push(newValueAtThisStep);
      }

      if (valueTable[valueTable.length] !== newValue) {
        valueTable.push(newValue);
      }
    }

    let thisInterval = setInterval(() => {
      if (valueTable.length > 0) {
        this.setFaderValue(channel, valueTable.shift());
      } else {
        clearInterval(thisInterval);
      }
    }, this.resolution);

    this.intervals.push(thisInterval);
  }

  muteChannel(channel) {
    debug(`Muting channel ${channel}`);

    let fixedChannel = this.channelFix(channel);

    this.channels.setMute(channel, true);

    this.command(`/ch/${fixedChannel}/mix/on`, 0);
  }

  unmuteChannel(channel) {
    debug(`Unmuting channel ${channel}`);

    let fixedChannel = this.channelFix(channel);

    this.channels.setMute(channel, false);

    this.command(`/ch/${fixedChannel}/mix/on`, 1);
  }

  getAllFaderValues() {
    for (let i = 1; i <= 32; i++) {
      this.getFaderValue(i);
    }
  }

  graduallySetAllFaderValues(values, ms) {
    debug('Setting all faders');

    // Stop all pre-existing movements
    this.stopAllIntervals();

    values.forEach((value) => {
      this.graduallySetFaderValue(value.channel, value.faderValue, ms);

      if (value.muted) {
        this.muteChannel(value.channel);
      } else {
        this.unmuteChannel(value.channel);
      }
    });
  }

  setAllFaderValues(values) {
    // Stop all pre-existing movements
    this.stopAllIntervals();

    values.forEach((value) => {
      this.setFaderValue(value.channel, value.faderValue);

      if (value.muted) {
        this.muteChannel(value.channel);
      } else {
        this.unmuteChannel(value.channel);
      }
    });
  }

  // Subscribe
  subscribe() {
    this.command('/xremote');
    this.command('/info');
  }

  startSubscription() {
    this.subscribe();
    this.getAllFaderValues();

    this.subscriptionInterval = setInterval(() => {
      this.subscribe();
    }, 7000);
  }

  stopSubscription() {
    clearInterval(this.subscriptionInterval);
  }
}

module.exports = M32Client;
