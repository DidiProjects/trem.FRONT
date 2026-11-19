import { Route } from 'react-router'
import { GroupPage } from '@/pages/GroupPage'
import { GROUPS, toolsOf } from '@/products/registry'
import { Guarded, ToolRoute } from './ProductGuards'

/** One route per group landing page and per tool, generated from the registry. */
export function productRoutes() {
  return GROUPS.filter((g) => toolsOf(g).length > 0).flatMap((group) => [
    <Route
      key={group.path}
      path={group.path}
      element={
        <Guarded group={group}>
          <GroupPage group={group} />
        </Guarded>
      }
    />,
    ...toolsOf(group).map((tool) => <Route key={tool.path} path={`${tool.path}/*`} element={<ToolRoute group={group} tool={tool} />} />),
  ])
}
