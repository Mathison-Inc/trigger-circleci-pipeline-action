import {
  getInput,
  setFailed,
  startGroup,
  endGroup,
  info,
  error as coreError,
} from "@actions/core";
import { context } from "@actions/github";
import axios from "axios";

startGroup("Preparing CircleCI Pipeline Trigger");
const payload = context.payload;
const pattern = /github\.com\/(repos\/)?(.*)\/(.*)$/gm;
const [, , repoOrg, repoName] = pattern.exec(payload.repository.url);
info(`URL 2: ${payload.repository.url}`);
info(`Org 2: ${repoOrg}`);
info(`Repo 2: ${repoName}`);
const ref = context.ref;

const getBranch = () => {
  info("The ref:", ref)
  if (ref.startsWith("refs/heads/")) {
    return ref.substring(11);
  }
  if (ref.startsWith("refs/pull/")) {
    info("Starts with refs/pull/!")
    return ref.replace("merge", "head");
  }
  return ref;
};
const getTag = () => {
  if (ref.startsWith("refs/tags/")) {
    return ref.substring(10);
  }
};

const headers = {
  "content-type": "application/json",
  "x-attribution-login": context.actor,
  "x-attribution-actor-id": context.actor,
  "Circle-Token": `${process.env.CCI_TOKEN}`,
};
const parameters = {
  GHA_Actor: context.actor,
  GHA_Action: context.action,
  GHA_Event: context.eventName,
};

const metaData = getInput("GHA_Meta");
if (metaData.length > 0) {
  Object.assign(parameters, { GHA_Meta: metaData });
}

const body = {
  parameters: parameters,
};

const tag = getTag();
const branch = getBranch();

if (tag) {
  Object.assign(body, { tag });
} else {
  Object.assign(body, { branch });
}

const url = `https://circleci.com/api/v2/project/gh/${repoOrg}/${repoName}/pipeline`;

info(`Triggering CircleCI Pipeline for ${repoOrg}/${repoName}`);
info(`Triggering URL: ${url}`);
if (tag) {
  info(`Triggering tag: ${tag}`);
} else {
  info(`Triggering branch: ${branch}`);
}
info(`Parameters:\n${JSON.stringify(parameters)}`);
endGroup();

axios
  .post(url, body, { headers: headers })
  .then((response) => {
    startGroup("Successfully triggered CircleCI Pipeline");
    info(`CircleCI API Response: ${JSON.stringify(response.data)}`);
    endGroup();
  })
  .catch((error) => {
    startGroup("Failed to trigger CircleCI Pipeline");
    coreError(error);
    setFailed(error.message);
    endGroup();
  });
