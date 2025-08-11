import { gql } from '@apollo/client';

// Setting Queries
export const LIST_SETTINGS = gql`
  query ListSettings($filter: ModelSettingFilterInput, $limit: Int) {
    listSettings(filter: $filter, limit: $limit) {
      items {
        id
        type
        key
        value
        entityId
        description
        isActive
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;

export const GET_SETTING = gql`
  query GetSetting($id: ID!) {
    getSetting(id: $id) {
      id
      type
      key
      value
      entityId
      description
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const GET_USER_SETTINGS = gql`
  query GetUserSettings($entityId: ID!, $type: String) {
    listSettings(filter: { 
      entityId: { eq: $entityId },
      type: { eq: $type }
    }) {
      items {
        id
        type
        key
        value
        entityId
        description
        isActive
        createdAt
        updatedAt
      }
    }
  }
`;

export const GET_POST_SETTINGS = gql`
  query GetPostSettings($entityId: ID!) {
    listSettings(filter: { 
      entityId: { eq: $entityId },
      type: { eq: "post" }
    }) {
      items {
        id
        type
        key
        value
        entityId
        description
        isActive
        createdAt
        updatedAt
      }
    }
  }
`;

// Setting Mutations
export const CREATE_SETTING = gql`
  mutation CreateSetting($input: CreateSettingInput!) {
    createSetting(input: $input) {
      id
      type
      key
      value
      entityId
      description
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_SETTING = gql`
  mutation UpdateSetting($input: UpdateSettingInput!) {
    updateSetting(input: $input) {
      id
      type
      key
      value
      entityId
      description
      isActive
      updatedAt
    }
  }
`;

export const DELETE_SETTING = gql`
  mutation DeleteSetting($input: DeleteSettingInput!) {
    deleteSetting(input: $input) {
      id
      type
      key
      entityId
    }
  }
`;

// Setting Subscriptions
export const ON_CREATE_SETTING = gql`
  subscription OnCreateSetting {
    onCreateSetting {
      id
      type
      key
      value
      entityId
      description
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const ON_UPDATE_SETTING = gql`
  subscription OnUpdateSetting {
    onUpdateSetting {
      id
      type
      key
      value
      entityId
      description
      isActive
      updatedAt
    }
  }
`;

export const ON_DELETE_SETTING = gql`
  subscription OnDeleteSetting {
    onDeleteSetting {
      id
      type
      key
      entityId
    }
  }
`;
