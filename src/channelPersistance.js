let channels = [];

// Init
for (let i = 1; i <= 32; i++) {
  channels.push({
    channel: i,
    name: null,
    faderValue: null,
    muted: null,
  });
}

const getAll = () => {
  return JSON.parse(JSON.stringify(channels));
};

const get = (channel) => {
  if (channel === undefined) {
    return JSON.parse(JSON.stringify(channels));
  } else {
    let thisChannel = channels.filter((x) => x.channel === channel);

    return JSON.parse(JSON.stringify(thisChannel[0]));
  }
};

const setMute = (channel, muted) => {
  let thisChannel = channels.filter((x) => x.channel === channel)[0];

  if (thisChannel !== null) {
    thisChannel.muted = muted;
  }
};

const setFader = (channel, value) => {
  let thisChannel = channels.filter((x) => x.channel === channel)[0];

  if (thisChannel !== null) {
    thisChannel.faderValue = value;
  }
};

const setName = (channel, name) => {
  let thisChannel = channels.filter((x) => x.channel === channel)[0];

  if (thisChannel !== null) {
    thisChannel.name = name;
  }
}

module.exports = {
  get,
  getAll,
  setMute,
  setName,
  setFader,
};
