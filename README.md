# netzwerk-backend

A tiny backend to scrape project descriptions from befriended collectives and their respective Matrix servers. The projects have to be created using the [medienhaus-cms](https://github.com/medienhaus/medienhaus-cms).

### Routes

- `/projects/` - Returns all projects that could be found
- `/projects/<projectSpaceId>` - Returns all details about a specfici project, including the full project description

## Development

### Installation

```bash
$ npm install
```

### Configuration

Configuration happens via environment variables. To start developing locally just copy the supplied `.env.example` file to `.env` and adjust the values of the variables to your likings.

### Running the backend

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev
```

