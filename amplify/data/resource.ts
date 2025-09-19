import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any user authenticated via an API key can "create", "read",
"update", and "delete" any "Todo" records.
=========================================================================*/
const schema = a.schema({
  // User model
  User: a
    .model({
      id: a.id().required(),
      email: a.email().required(),
      name: a.string().required(),
      preferredUsername: a.string(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      // Relations
      ownedTeams: a.hasMany('Team', 'ownerId'),
      teamMemberships: a.hasMany('TeamMember', 'userId'),
      createdEvents: a.hasMany('Event', 'createdBy'),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.authenticated().to(['read']),
    ]),

  // Team model
  Team: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      description: a.string(),
      ownerId: a.id().required(),
      subscriptionKey: a.string(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      // Relations
      owner: a.belongsTo('User', 'ownerId'),
      members: a.hasMany('TeamMember', 'teamId'),
      events: a.hasMany('Event', 'teamId'),
    })
    .authorization((allow) => [
      allow.owner('ownerId'),
      allow.authenticated().to(['read']).where((team) => team.members.userId.eq('{{sub}}')),
    ]),

  // TeamMember model
  TeamMember: a
    .model({
      id: a.id().required(),
      teamId: a.id().required(),
      userId: a.id().required(),
      role: a.enum(['owner', 'member', 'viewer']),
      joinedAt: a.datetime(),
      // Relations
      team: a.belongsTo('Team', 'teamId'),
      user: a.belongsTo('User', 'userId'),
    })
    .authorization((allow) => [
      allow.owner('userId'),
      allow.authenticated().to(['read']).where((member) => member.team.members.userId.eq('{{sub}}')),
    ]),

  // Event model
  Event: a
    .model({
      id: a.id().required(),
      teamId: a.id().required(),
      title: a.string().required(),
      description: a.string(),
      startTime: a.datetime().required(),
      endTime: a.datetime().required(),
      isAllDay: a.boolean().default(false),
      location: a.string(),
      category: a.enum(['meeting', 'task', 'reminder']).default('meeting'),
      color: a.string().default('#3B82F6'),
      createdBy: a.id().required(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      // Relations
      team: a.belongsTo('Team', 'teamId'),
      creator: a.belongsTo('User', 'createdBy'),
    })
    .authorization((allow) => [
      allow.owner('createdBy'),
      allow.authenticated().to(['read', 'create']).where((event) => event.team.members.userId.eq('{{sub}}')),
      allow.authenticated().to(['update', 'delete']).where((event) => event.team.ownerId.eq('{{sub}}')),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});