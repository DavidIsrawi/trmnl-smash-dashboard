import { gql } from 'graphql-request';

export const GET_USER = gql`
  query GetUser($slug: String!) {
    user(slug: $slug) {
      id
      slug
      images {
        id
        url
        type
      }
      player {
        id
        gamerTag
      }
    }
  }
`;
