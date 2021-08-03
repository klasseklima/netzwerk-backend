import { Injectable } from '@nestjs/common';
import * as matrixcs from "matrix-js-sdk";
import * as _ from 'lodash';
import * as fetch from 'node-fetch'

@Injectable()
export class AppService {
  createMatrixClient (userId, accessToken) {
    return matrixcs.createClient({
      baseUrl: process.env.MATRIX_BASE_URL,
      accessToken: accessToken,
      userId: userId,
      useAuthorizationHeader: true
    })
  }

  async buildProjectObject (projectSpaceId) {
    const result = {}
    const matrixClient = this.createMatrixClient(process.env.MATRIX_USER_ID, process.env.MATRIX_USER_ACCESSTOKEN)

    const projectSpaceMedienhausStateEvent = await matrixClient.getStateEvent(projectSpaceId, 'dev.medienhaus.meta')

    if (!projectSpaceMedienhausStateEvent) return;
    if (projectSpaceMedienhausStateEvent.type != 'studentproject') return;

    const projectSpaceSummary = await matrixClient.getSpaceSummary(projectSpaceId)
    _.merge(result, {
      id: projectSpaceSummary.rooms[0].room_id,
      name: projectSpaceSummary.rooms[0].name,
      description: projectSpaceSummary.rooms[0].topic,
      credits: projectSpaceMedienhausStateEvent.credit,
    })

    // Thumbnail
    const projectSpaceAvatarStateEvent = await matrixClient.getStateEvent(projectSpaceId, 'm.room.avatar').catch(() => {})
    if (projectSpaceAvatarStateEvent) {
      _.set(result, 'thumbnail', await matrixClient.mxcUrlToHttp(projectSpaceAvatarStateEvent.url, 800, 600, 'scale', true))
    }

    // Authors
    if (projectSpaceMedienhausStateEvent.alternativeAuthors && projectSpaceMedienhausStateEvent.alternativeAuthors.length > 0) {
      _.set(result, 'authors', projectSpaceMedienhausStateEvent.alternativeAuthors)
    } else {
      const members = await matrixClient.getJoinedRoomMembers(projectSpaceId)
      _.set(result, 'authors', _.map(members.joined, (member) => member.display_name))
    }

    return result
  }

  async getProjects() {
    const memberCollectives = [
      {
        name: 'Klasse Klima',
        projectSpaceId: '!UsIKiuJmWjpHSqfIHj:dev.medienhaus.udk-berlin.de'
      }
    ]

    const result = {};
    const matrixClient = this.createMatrixClient(process.env.MATRIX_USER_ID, process.env.MATRIX_USER_ACCESSTOKEN)

    await Promise.all(memberCollectives.map(async (collective) => {
      const projectSpaceSummary = await matrixClient.getSpaceSummary(collective.projectSpaceId);
      await Promise.all(projectSpaceSummary.events.map(async (event) => {
        if (event.room_id != collective.projectSpaceId) return;

        _.set(result, [event.state_key], {
          group: collective.name,
          ...await this.buildProjectObject(event.state_key)
        })
      }))
    }))

    // @TODO: Debug to build a filter
    _.set(result, ['!pCaZytendJhIreMyDB:dev.medienhaus.udk-berlin.de', 'group'], 'Klasse Erde')

    return result
  }

  async getProject(projectSpaceId) {
    const result = await this.buildProjectObject(projectSpaceId)

    const matrixClient = this.createMatrixClient(process.env.MATRIX_USER_ID, process.env.MATRIX_USER_ACCESSTOKEN)

    // Get the actual content blocks content
    let languageSpaces = {}
    const spaceSummary = await matrixClient.getSpaceSummary(projectSpaceId, 0)
    spaceSummary.rooms.map(languageSpace => {
      if (languageSpace.room_id == projectSpaceId) return
      languageSpaces[languageSpace.name] = languageSpace.room_id
    })

    const req = {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + process.env.MATRIX_USER_ACCESSTOKEN }
    }

    // @TODO: Only get EN content for now; we should allow the request to specify a language
    let formatted_content = ''
    const contentRoomsDe = await matrixClient.getSpaceSummary(languageSpaces.en, 0)
    await Promise.all(contentRoomsDe.rooms.map(async (contentRoom) => {
      if (contentRoom.room_id == languageSpaces.en) return
      const allMessages = process.env.MATRIX_BASE_URL + `/_matrix/client/r0/rooms/${contentRoom.room_id}/messages?limit=9&dir=b`
      const result = await fetch(allMessages, req)
      const data = await result.json()
      const htmlString = data.chunk.map(type => {
          if (type.type === 'm.room.message' && type.content['m.new_content'] === undefined && type.redacted_because === undefined) {
            const content = type.content
            const bar = { ...content, ...{ eventId: type.event_id } }
            return bar
          } else { return null }
        }
      ).filter(x => x !== null)[0]

      if (htmlString.msgtype == 'm.text') {
        formatted_content += htmlString.formatted_body
      } else if(htmlString.msgtype == 'm.image') {
        formatted_content += `<img src="${matrixClient.mxcUrlToHttp(htmlString.url)}" />`
      }
    }))

    result['formatted_content'] = formatted_content
    return result
  }
}
